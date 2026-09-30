const Listing = require("../models/listing");
const db = require("../config/db");

const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");

const mapToken = process.env.MAP_TOKEN;

const geoCodingClient = mbxGeocoding({
    accessToken: mapToken
});


// =========================
// INDEX
// =========================

module.exports.index = async (req, res) => {

    const allListings = await Listing.find();

    res.render("./listings/index.ejs", {
        allListings
    });
};


// =========================
// NEW LISTING FORM
// =========================

module.exports.renderNewForm = (req, res) => {

    res.render("listings/new.ejs");
};


// =========================
// SHOW LISTING
// =========================

module.exports.showListing = async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {

        req.flash(
            "error",
            "Listing you requested for does not exist!"
        );

        return res.redirect("/listings");
    }

    // Get reviews + review authors
    const [reviews] = await db.execute(
        `
        SELECT
            r.id,
            r.comment,
            r.rating,
            r.created_at,
            u.id AS author_id,
            u.username AS author_username,
            u.email AS author_email
        FROM reviews r
        LEFT JOIN users u
            ON r.author_id = u.id
        WHERE r.listing_id = ?
        ORDER BY r.id DESC
        `,
        [id]
    );

    listing.reviews = reviews;

    res.render("listings/show.ejs", {
        listing
    });
};


// =========================
// CREATE LISTING
// =========================

module.exports.createListing = async (req, res) => {

    const response = await geoCodingClient
        .forwardGeocode({
            query: req.body.listing.location,
            limit: 1
        })
        .send();

    const geometry =
        response.body.features.length > 0
            ? response.body.features[0].geometry
            : {
                type: "Point",
                coordinates: [0, 0]
            };

    const image = {

        filename: req.file
            ? req.file.filename
            : null,

        url: req.file
            ? req.file.path
            : null
    };

    const newListing = {

        ...req.body.listing,

        owner: req.user.id,

        image,

        geometry
    };

    await Listing.create(newListing);

    req.flash(
        "success",
        "New listing created!"
    );

    res.redirect("/listings");
};


// =========================
// EDIT FORM
// =========================

module.exports.renderEditForm = async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {

        req.flash(
            "error",
            "Listing you are trying to edit does not exist!"
        );

        return res.redirect("/listings");
    }

    let imageUrl = listing.image?.url;

    if (imageUrl) {

        imageUrl = imageUrl.replace(
            "/upload",
            "/upload/w_250,h_160"
        );
    }

    res.render("listings/edit.ejs", {
        listing,
        imageUrl
    });
};


// =========================
// UPDATE LISTING
// =========================

module.exports.updateListing = async (req, res) => {

    const { id } = req.params;

    const response = await geoCodingClient
        .forwardGeocode({
            query: `${req.body.listing.location}, ${req.body.listing.country}`,
            limit: 1
        })
        .send();

    const geometry =
        response.body.features.length > 0
            ? response.body.features[0].geometry
            : {
                type: "Point",
                coordinates: [0, 0]
            };

    const updatedData = {

        ...req.body.listing,

        geometry
    };

    if (req.file) {

        updatedData.image = {

            filename: req.file.filename,

            url: req.file.path
        };
    }

    await Listing.findByIdAndUpdate(
        id,
        updatedData
    );

    req.flash(
        "success",
        "Listing updated!"
    );

    res.redirect(`/listings/${id}`);
};


// =========================
// FILTER
// =========================

module.exports.filter = async (req, res) => {

    const { id } = req.params;

    const [allListings] = await db.execute(
        `
        SELECT
            l.*,
            u.username AS owner_username,
            u.email AS owner_email
        FROM listings l
        LEFT JOIN users u
            ON l.owner_id = u.id
        WHERE l.category = ?
        ORDER BY l.id DESC
        `,
        [id]
    );

    const formattedListings = allListings.map(formatListing);

    if (formattedListings.length !== 0) {

        res.locals.success =
            `Listings Filtered by ${id}!`;

        return res.render(
            "listings/index.ejs",
            {
                allListings: formattedListings
            }
        );
    }

    req.flash(
        "error",
        `There is no any Listing for ${id}!`
    );

    res.redirect("/listings");
};


// =========================
// SEARCH
// =========================

module.exports.search = async (req, res) => {

    let input = req.query.q;

    if (!input || input.trim() === "") {

        req.flash(
            "error",
            "Please enter search query!"
        );

        return res.redirect("/listings");
    }

    input = input.trim().replace(/\s+/g, " ");

    // Search title
    let [rows] = await db.execute(
        `
        SELECT
            l.*,
            u.username AS owner_username,
            u.email AS owner_email
        FROM listings l
        LEFT JOIN users u
            ON l.owner_id = u.id
        WHERE l.title LIKE ?
        ORDER BY l.id DESC
        `,
        [`%${input}%`]
    );

    let allListings = rows.map(formatListing);

    if (allListings.length !== 0) {

        res.locals.success =
            "Listings searched by Title!";

        return res.render(
            "listings/index.ejs",
            {
                allListings
            }
        );
    }


    // Search category
    [rows] = await db.execute(
        `
        SELECT
            l.*,
            u.username AS owner_username,
            u.email AS owner_email
        FROM listings l
        LEFT JOIN users u
            ON l.owner_id = u.id
        WHERE l.category LIKE ?
        ORDER BY l.id DESC
        `,
        [`%${input}%`]
    );

    allListings = rows.map(formatListing);

    if (allListings.length !== 0) {

        res.locals.success =
            "Listings searched by Category!";

        return res.render(
            "listings/index.ejs",
            {
                allListings
            }
        );
    }


    // Search country
    [rows] = await db.execute(
        `
        SELECT
            l.*,
            u.username AS owner_username,
            u.email AS owner_email
        FROM listings l
        LEFT JOIN users u
            ON l.owner_id = u.id
        WHERE l.country LIKE ?
        ORDER BY l.id DESC
        `,
        [`%${input}%`]
    );

    allListings = rows.map(formatListing);

    if (allListings.length !== 0) {

        res.locals.success =
            "Listings searched by Country!";

        return res.render(
            "listings/index.ejs",
            {
                allListings
            }
        );
    }


    // Search location
    [rows] = await db.execute(
        `
        SELECT
            l.*,
            u.username AS owner_username,
            u.email AS owner_email
        FROM listings l
        LEFT JOIN users u
            ON l.owner_id = u.id
        WHERE l.location LIKE ?
        ORDER BY l.id DESC
        `,
        [`%${input}%`]
    );

    allListings = rows.map(formatListing);

    if (allListings.length !== 0) {

        res.locals.success =
            "Listings searched by Location!";

        return res.render(
            "listings/index.ejs",
            {
                allListings
            }
        );
    }


    // Search by price
    const price = Number(input);

    if (!Number.isNaN(price)) {

        [rows] = await db.execute(
            `
            SELECT
                l.*,
                u.username AS owner_username,
                u.email AS owner_email
            FROM listings l
            LEFT JOIN users u
                ON l.owner_id = u.id
            WHERE l.price <= ?
            ORDER BY l.price ASC
            `,
            [price]
        );

        allListings = rows.map(formatListing);

        if (allListings.length !== 0) {

            res.locals.success =
                `Listings searched by price less than Rs ${price}!`;

            return res.render(
                "listings/index.ejs",
                {
                    allListings
                }
            );
        }
    }


    req.flash(
        "error",
        "No listings found based on your search!"
    );

    res.redirect("/listings");
};


// =========================
// DELETE LISTING
// =========================

module.exports.destroyListing = async (req, res) => {

    const { id } = req.params;

    const deletedListing =
        await Listing.findByIdAndDelete(id);

    console.log(deletedListing);

    req.flash(
        "success",
        "Listing deleted!"
    );

    res.redirect("/listings");
};


// =========================
// RESERVE LISTING
// =========================

module.exports.reserveListing = async (req, res) => {

    const { id } = req.params;

    req.flash(
        "success",
        "Reservation Details sent to your Email!"
    );

    res.redirect(`/listings/${id}`);
};


// =========================
// FORMAT LISTING
// =========================

function formatListing(row) {

    return {

        ...row,

        image: {
            filename: row.image_filename,
            url: row.image_url
        },

        geometry: {
            type: "Point",
            coordinates: [
                row.longitude,
                row.latitude
            ]
        },

        owner: {
            id: row.owner_id,
            username: row.owner_username,
            email: row.owner_email
        }
    };
}