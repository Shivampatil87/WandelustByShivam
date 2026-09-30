const db = require("../config/db");

const Review = {
    // Find one review by ID
    async findById(id) {
        const [rows] = await db.execute(
            `SELECT
                r.id,
                r.comment,
                r.rating,
                r.created_at,
                r.author_id,
                r.listing_id,
                u.username AS author_username,
                u.email AS author_email
            FROM reviews r
            LEFT JOIN users u ON r.author_id = u.id
            WHERE r.id = ?`,
            [id]
        );

        return rows[0] || null;
    },

    // Get all reviews for a listing
    async findByListingId(listingId) {
        const [rows] = await db.execute(
            `SELECT
                r.id,
                r.comment,
                r.rating,
                r.created_at,
                r.author_id,
                r.listing_id,
                u.username AS author_username,
                u.email AS author_email
            FROM reviews r
            LEFT JOIN users u ON r.author_id = u.id
            WHERE r.listing_id = ?
            ORDER BY r.id DESC`,
            [listingId]
        );

        return rows;
    },

    // Create a review
    async create(data) {
        const {
            comment,
            rating,
            author_id,
            listing_id
        } = data;

        const [result] = await db.execute(
            `INSERT INTO reviews
            (comment, rating, author_id, listing_id)
            VALUES (?, ?, ?, ?)`,
            [
                comment,
                rating,
                author_id,
                listing_id
            ]
        );

        return await Review.findById(result.insertId);
    },

    // Delete a review
    async findByIdAndDelete(id) {
        const review = await Review.findById(id);

        if (!review) {
            return null;
        }

        await db.execute(
            "DELETE FROM reviews WHERE id = ?",
            [id]
        );

        return review;
    }
};

module.exports = Review;

