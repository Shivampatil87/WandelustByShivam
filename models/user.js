const db = require("../config/db");
const bcrypt = require("bcrypt");

const User = {

    async findByUsername(username) {
        const [rows] = await db.execute(
            "SELECT * FROM users WHERE username = ?",
            [username]
        );

        return rows[0];
    },

    async findById(id) {
        const [rows] = await db.execute(
            "SELECT * FROM users WHERE id = ?",
            [id]
        );

        return rows[0];
    },

    async create(username, email, password) {
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            `INSERT INTO users 
            (username, email, password_hash)
            VALUES (?, ?, ?)`,
            [username, email, hashedPassword]
        );

        return {
            id: result.insertId,
            username,
            email
        };
    },

    async comparePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    },

    async serializeUser(user) {
        return user.id;
    },

    async deserializeUser(id) {
        return await User.findById(id);
    }
};

module.exports = User;