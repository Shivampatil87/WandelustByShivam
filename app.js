if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();

const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

const ExpressError = require("./utils/ExpressError.js");

const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const db = require("./config/db.js");


// --------------------
// Basic configuration
// --------------------

app.use(express.static(path.join(__dirname, "/public")));

app.engine("ejs", ejsMate);

app.use(methodOverride("_method"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));


// --------------------
// MySQL Session Store
// --------------------

const sessionStore = new MySQLStore({
    host: "127.0.0.1",
    port: 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const sessionOptions = {
    store: sessionStore,

    secret: process.env.SESSION_SECRET,

    resave: false,

    saveUninitialized: false,

    cookie: {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
};

app.use(session(sessionOptions));


// --------------------
// Flash messages
// --------------------

app.use(flash());


// --------------------
// Passport
// --------------------


app.use(passport.initialize());

app.use(passport.session());


// This will be completed when we convert user.js
passport.use(
    new LocalStrategy(async (username, password, done) => {

        try {

            const user = await User.findByUsername(username);

            if (!user) {
                return done(null, false, {
                    message: "Invalid username or password"
                });
            }

            const isValid = await User.comparePassword(
                password,
                user.password_hash
            );

            if (!isValid) {
                return done(null, false, {
                    message: "Invalid username or password"
                });
            }

            return done(null, user);

        } catch (err) {

            return done(err);

        }

    })
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {

    try {

        const user = await User.findById(id);

        done(null, user);

    } catch (err) {

        done(err);

    }

});

// --------------------
// Global variables
// --------------------

app.use((req, res, next) => {

    res.locals.success = req.flash("success");

    res.locals.error = req.flash("error");

    res.locals.currUser = req.user;

    next();
});


// --------------------
// Routes
// --------------------

app.get("/", (req, res) => {
    res.redirect("/listings");
});

app.use("/listings", listingRouter);

app.use("/listings/:id/reviews", reviewRouter);

app.use("/", userRouter);


// --------------------
// 404 Handler
// --------------------

app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});


// --------------------
// Error Handler
// --------------------

app.use((err, req, res, next) => {

    let {
        statusCode = 500,
        message = "Some Error Occured!"
    } = err;

    res.status(statusCode).render("./listings/error.ejs", {
        message
    });
});


// --------------------
// Start Server
// --------------------

app.listen(8080, () => {
    console.log("Listening on port 8080");
});