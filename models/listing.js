const db = require("../config/db");

const Listing = {

    async find() {
        const [rows] = await db.execute(`
            SELECT 
                l.*,
                u.username AS owner_username,
                u.email AS owner_email
            FROM listings l
            LEFT JOIN users u ON l.owner_id = u.id
            ORDER BY l.id DESC
        `);

        return rows.map(formatListing);
    },


    async findById(id) {
        const [rows] = await db.execute(`
            SELECT 
                l.*,
                u.username AS owner_username,
                u.email AS owner_email
            FROM listings l
            LEFT JOIN users u ON l.owner_id = u.id
            WHERE l.id = ?
        `, [id]);

        if (rows.length === 0) {
            return null;
        }

        return formatListing(rows[0]);
    },


    async create(data) {

        const {
            title,
            description,
            image,
            price,
            location,
            country,
            owner,
            geometry,
            category
        } = data;

        const imageFilename = image?.filename || null;
        const imageUrl = image?.url || null;

        const latitude =
            geometry?.coordinates?.[1] || null;

        const longitude =
            geometry?.coordinates?.[0] || null;

        const ownerId =
            typeof owner === "object"
                ? owner.id
                : owner;


        const [result] = await db.execute(`
            INSERT INTO listings (
                title,
                description,
                image_filename,
                image_url,
                price,
                location,
                country,
                owner_id,
                latitude,
                longitude,
                category
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title,
            description,
            imageFilename,
            imageUrl,
            price || null,
            location,
            country,
            ownerId || null,
            latitude,
            longitude,
            category || null
        ]);

        return await Listing.findById(result.insertId);
    },


    async findByIdAndUpdate(id, data) {

        const {
            title,
            description,
            image,
            price,
            location,
            country,
            geometry,
            category
        } = data;

        const imageFilename = image?.filename || null;
        const imageUrl = image?.url || null;

        const latitude =
            geometry?.coordinates?.[1] || null;

        const longitude =
            geometry?.coordinates?.[0] || null;


        await db.execute(`
            UPDATE listings
            SET
                title = ?,
                description = ?,
                image_filename = ?,
                image_url = ?,
                price = ?,
                location = ?,
                country = ?,
                latitude = ?,
                longitude = ?,
                category = ?
            WHERE id = ?
        `, [
            title,
            description,
            imageFilename,
            imageUrl,
            price || null,
            location,
            country,
            latitude,
            longitude,
            category || null,
            id
        ]);

        return await Listing.findById(id);
    },


    async findByIdAndDelete(id) {

        const listing = await Listing.findById(id);

        if (!listing) {
            return null;
        }

        await db.execute(
            "DELETE FROM reviews WHERE listing_id = ?",
            [id]
        );

        await db.execute(
            "DELETE FROM listings WHERE id = ?",
            [id]
        );

        return listing;
    }
};


function formatListing(row) {

    return {
        ...row,

        id: row.id,

        title: row.title,

        description: row.description,

        price: row.price,

        location: row.location,

        country: row.country,

        category: row.category,

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


module.exports = Listing;