const User = require("../models/user.js");

module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
};


module.exports.signup = async (req, res, next) => {

    try {

        const { username, email, password } = req.body;

        // Check whether username already exists
        const existingUser = await User.findByUsername(username);

        if (existingUser) {
            req.flash("error", "Username already exists!");
            return res.redirect("/signup");
        }

        // Create user in MySQL
        const registeredUser = await User.create(
            username,
            email,
            password
        );

        // Automatically login after signup
        req.login(registeredUser, (err) => {

            if (err) {
                return next(err);
            }

            req.flash(
                "success",
                "Welcome to WanderLust!"
            );

            res.redirect("/listings");
        });

    } catch (error) {

        console.error("Signup error:", error);

        req.flash(
            "error",
            error.message
        );

        res.redirect("/signup");
    }
};


module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs");
};


module.exports.login = async (req, res) => {

    req.flash(
        "success",
        "Welcome back to WanderLust!"
    );

    const redirectUrl =
        res.locals.redirectUrl || "/listings";

    res.redirect(redirectUrl);
};


module.exports.logout = (req, res, next) => {

    req.logout((err) => {

        if (err) {
            return next(err);
        }

        req.flash(
            "success",
            "You are logged out!"
        );

        res.redirect("/listings");
    });
};