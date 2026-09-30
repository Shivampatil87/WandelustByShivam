require("dotenv").config({
    path: "./sync.env"
});

const mysql = require("mysql2/promise");

const railwayDB = mysql.createPool({
    host: process.env.RAILWAY_DB_HOST,
    port: process.env.RAILWAY_DB_PORT,
    user: process.env.RAILWAY_DB_USER,
    password: process.env.RAILWAY_DB_PASSWORD,
    database: process.env.RAILWAY_DB_NAME,
    waitForConnections: true,
    connectionLimit: 5
});

const localDB = mysql.createPool({
    host: process.env.LOCAL_DB_HOST,
    port: process.env.LOCAL_DB_PORT,
    user: process.env.LOCAL_DB_USER,
    password: process.env.LOCAL_DB_PASSWORD,
    database: process.env.LOCAL_DB_NAME,
    waitForConnections: true,
    connectionLimit: 5
});


async function syncUsers() {

    console.log("Syncing users...");

    const [users] = await railwayDB.execute(
        "SELECT * FROM users"
    );

    for (const user of users) {

        await localDB.execute(
            `
            INSERT INTO users
            (id, username, email, password_hash)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                username = VALUES(username),
                email = VALUES(email),
                password_hash = VALUES(password_hash)
            `,
            [
                user.id,
                user.username,
                user.email,
                user.password_hash
            ]
        );
    }

    console.log(`Users synced: ${users.length}`);
}


async function syncListings() {

    console.log("Syncing listings...");

    const [listings] = await railwayDB.execute(
        "SELECT * FROM listings"
    );

    for (const listing of listings) {

        await localDB.execute(
            `
            INSERT INTO listings
            (
                id,
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                description = VALUES(description),
                image_filename = VALUES(image_filename),
                image_url = VALUES(image_url),
                price = VALUES(price),
                location = VALUES(location),
                country = VALUES(country),
                owner_id = VALUES(owner_id),
                latitude = VALUES(latitude),
                longitude = VALUES(longitude),
                category = VALUES(category)
            `,
            [
                listing.id,
                listing.title,
                listing.description,
                listing.image_filename,
                listing.image_url,
                listing.price,
                listing.location,
                listing.country,
                listing.owner_id,
                listing.latitude,
                listing.longitude,
                listing.category
            ]
        );
    }

    console.log(`Listings synced: ${listings.length}`);
}


async function syncReviews() {

    console.log("Syncing reviews...");

    const [reviews] = await railwayDB.execute(
        "SELECT * FROM reviews"
    );

    for (const review of reviews) {

        await localDB.execute(
            `
            INSERT INTO reviews
            (
                id,
                comment,
                rating,
                created_at,
                author_id,
                listing_id
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                comment = VALUES(comment),
                rating = VALUES(rating),
                created_at = VALUES(created_at),
                author_id = VALUES(author_id),
                listing_id = VALUES(listing_id)
            `,
            [
                review.id,
                review.comment,
                review.rating,
                review.created_at,
                review.author_id,
                review.listing_id
            ]
        );
    }

    console.log(`Reviews synced: ${reviews.length}`);
}


async function syncDatabase() {

    try {

        console.log("================================");
        console.log("Starting Railway → Local sync");
        console.log("================================");

        // Test connections
        await railwayDB.query("SELECT 1");
        console.log("✓ Railway MySQL connected");

        await localDB.query("SELECT 1");
        console.log("✓ Local MySQL connected");

        await syncUsers();

        await syncListings();

        await syncReviews();

        console.log("================================");
        console.log("✓ Database sync completed");
        console.log("================================");

    } catch (error) {

        console.error("❌ Sync failed:");
        console.error(error);

    } finally {

        await railwayDB.end();
        await localDB.end();

    }
}


syncDatabase();