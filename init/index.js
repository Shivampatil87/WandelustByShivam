require("dotenv").config();

const db = require("../config/db.js");
const initData = require("./data.js");

const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");

const mapToken = process.env.MAP_TOKEN;

const geoCodingClient = mbxGeocoding({
    accessToken: mapToken
});

const initDB = async () => {
    try {
        // Delete existing listings
        await db.execute("DELETE FROM listings");

        console.log("Old listings deleted.");

        for (const obj of initData.data) {
            let geometry = {
                type: "Point",
                coordinates: [0, 0]
            };

            try {
                const response = await geoCodingClient
                    .forwardGeocode({
                        query: `${obj.location}, ${obj.country}`,
                        limit: 1
                    })
                    .send();

                if (response.body.features.length > 0) {
                    geometry = response.body.features[0].geometry;
                }
            } catch (error) {
                console.error(
                    `Geocoding failed for ${obj.location}, ${obj.country}`
                );
            }

            const longitude = geometry.coordinates[0];
            const latitude = geometry.coordinates[1];

            await db.execute(
                `INSERT INTO listings (
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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    obj.title,
                    obj.description,

                    // Image
                    obj.image?.filename || null,
                    obj.image?.url || null,

                    obj.price || null,
                    obj.location,
                    obj.country,

                    // Owner
                    // Change this ID if your MySQL users table uses another user
                    1,

                    latitude,
                    longitude,

                    obj.category || null
                ]
            );
        }

        console.log("DB is initialized with MySQL!");
    } catch (error) {
        console.error("Error initializing DB:", error);
    } finally {
        await db.end();
    }
};

initDB();

