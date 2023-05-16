const serverless = require("serverless-http");
const express = require('express'),
    app = express(),
    morgan = require('morgan'),
    fs = require('fs'),
    uuid = require('uuid'),
    bodyParser = require('body-parser'),
    path = require('path'),
    mongoose = require('mongoose'),
    Models = require('./models.js'),
    bcrypt = require('bcrypt'),
    { check, validationResult } = require('express-validator');

// Assigning models for Movie and User
const Movies = Models.Movie;
const Users = Models.User;

// Set the listening port
const port = process.env.PORT || 8080;

// Middleware for handling JSON requests
app.use(bodyParser.json());

// Middleware for handling URL encoded requests
app.use(bodyParser.urlencoded({ extended: true }));

// Use Cross-Origin Resource Sharing on specific domains
const cors = require('cors');
//app.use(cors());

let allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:4200',
    'https://ecspecial-myflixapp.netlify.app',
    'https://ecspecial.github.io',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }
        if (allowedOrigins.indexOf(origin) === -1) {
          let message = `The CORS policy for this application doesn't allow access from origin ${origin}`;
          return callback(new Error(message), false);
        }
        return callback(null, true);
      },
    })
  );

let auth = require('./auth.js')(app);
const passport = require('passport');
require('./passport.js');

// Connect to MongoDB database
//mongoose.connect('', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connect( process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Route all requests for static data in public folder
//app.use(express.static('public'));

/**
 * Defaukt '/' endpoint, returns welcome message
 * @method GET
 * @name welcomeMessage
 * @kind function
 * @returns Welcome message
 */
app.get('/', (req, res) => {
    res.send('Welcome to my movie_api App!');
});

/**
 * Function to request full list of users
 * @method GET to endpoint '/users'
 * @name getUsers
 * @kind function
 * @requires passport module for authentication
 * @requires Users mongoose.Model
 * @returns a JSON object holding USERS list
 */
app.get('/users', passport.authenticate('jwt', { session: false }), (req, res) => {
    Users.find()
    .then((users) => {
        res.status(201).json(users);
    })
    .catch((err) => {
        console.log(err);
        res.status(500).send('Error: ' + err);
    });
});

/**
 * Function to request user data
 * @method GET to endpoint '/users/:username'
 * @name getUser
 * @kind function
 * @requires passport module for authentication
 * @requires Users mongoose.Model
 * @returns a JSON object holding USER data
 */
app.get('/users/:username', passport.authenticate('jwt', { session: false }), (req, res) => {
    Users.findOne({ Username: req.params.username })
    .then((user) => {
        if (user) {
            res.status(201).json(user);
        } else {
            res.status(400).send('User not found.');
        }
    })
    .catch((error) => {
        console.log(error);
        res.status(500).send('Error: ' + error);
    });
});

/**
 * Function to Register new user:
 * validates request JSON object (includes all required fields)
 * checks DB, if the user that is going to be created already exists
 * if no errors appeared, creates new user object in DB
 * @method POST to endpoint '/users'
 * @name addUser
 * @kind function
 * @requires passport module for authentication
 * @requires Users mongoose.Model
 * @returns a JSON object holding data of newly created user
 */
app.post('/users', [
    check('Username', 'Username is required (minimum 5 characters).').isLength({min: 5}),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
], (req, res) => {

    // Check for validation errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({ Username: req.body.Username })
    .then((user) => {
        if (user) {
            res.status(400).send(req.body.Username + ' already exists.');
        } else {
            Users.create({
                Username: req.body.Username,
                Password: hashedPassword,
                Email: req.body.Email,
                Birthday: req.body.Birthday,
                FavoriteMovies: req.body.FavoriteMovies
            })
            .then((user) => {res.status(201).json(user) })
            .catch((error) => {
                console.log(error);
                res.status(500).send('Error: ' + error);
            })
        }
    })
    .catch((error) => {
        console.log(error);
        res.status(500).send('Error: ' + error);
        });
});

/**
 * Function to update user information
 * validates request JSON object (includes all required fields)
 * checks DB, if the user that is going to be updated exists
 * if no errors appeared, updates user object in DB
 * @method PUT to endpoint '/users/:Username''
 * @name updateUser
 * @kind function
 * @requires passport module for authentication
 * @requires Users mongoose.Model
 * @returns a JSON object with updated information
 */
app.put('/users/:Username', [
    check('Username', 'Username is required.').not().isEmpty(),
    check('Username', 'Username can only contain numbers or letters.').isAlphanumeric(),
    check('Password', 'Password must be at least 8 characters long.').optional().isLength({min:8}),
    check('Email', 'Email doesn\'t appear to be valid.').isEmail()
], passport.authenticate('jwt', { session: false }), (req, res) => {
    
    // Check for validation errors
    let errors = validationResult(req);


    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = req.body.Password ? Users.hashPassword(req.body.Password) : Users.findOne({ Username: req.params.Username }).Password;
    if (req.body.Username  === req.params.Username) {
        Users.findOne({ Username: req.params.Username })
            .then((user) => {
                if(!user) {
                    res.status(400).send('User not found.')
                } else {
                    Users.findOneAndUpdate({ Username: req.params.Username }, {$set: {
                            Username: req.params.Username,
                            Password: hashedPassword,
                            Email: req.body.Email,
                            Birthday: req.body.Birthday,
                            FavoriteMovies: req.body.FavoriteMovies
                        }
                    },
                    { new: true },
                    (error, updatedUser) => {
                        if (error) {
                            console.log(error);
                            res.status(500).send('Error: ' + error);
                        } else {
                            res.status(201).json(updatedUser);
                        }
                    });
                }   
            }).catch((error) => {
                console.log(error);
                res.status(500).send('Error: ' + error);
                })
    } else {
        Users.findOne({ Username: req.params.Username })
        .then((user) => {
            if (user) {
                Users.findOne({ Username: req.body.Username })
                .then((updateUser) => {
                    if(updateUser && updateUser._id !== user._id) {
                        res.status(400).send('User already exists.')
                    } else {
                        Users.findOneAndUpdate({ Username: req.params.Username }, {$set: {
                                Username: req.body.Username,
                                Password: hashedPassword,
                                Email: req.body.Email,
                                Birthday: req.body.Birthday,
                                FavoriteMovies: req.body.FavoriteMovies
                            }
                        },
                        { new: true },
                        (error, updatedUser) => {
                            if (error) {
                                console.log(error);
                                res.status(500).send('Error: ' + error);
                            } else {
                                res.status(201).json(updatedUser);
                            }
                        });
                    }   
                }).catch((error) => {
                    console.log(error);
                    res.status(500).send('Error: ' + error);
            })
            } else {
                res.status(400).send('User not found.')
            }
        })
        .catch((error) => {
            console.log(error);
            res.status(500).send('Error: ' + error);
    })
    }
});

/**
 * Function to delete user profile
 * @method DELETE to endpoint '/users/:Username'
 * @name deleteUser
 * @kind function
 * @requires passport module for authentication
 * @requires Users mongoose.Model
 * @returns message that :Username was deleted
 */
app.delete('/users/:username', passport.authenticate('jwt', { session: false }), (req, res) => {
    Users.findOneAndDelete({ Username: req.params.username })
    .then((user) => {
        if (!user) {
            res.status(400).send('User not found.');
        } else {
            res.status(200).send(req.params.username + ' was deleted.');
        }
    }).catch((error) => {
        console.log(error);
        res.status(500).send('Error: ' + error);
        });
});

/**
 * @method GET to endpoint '/movies'
 * @name getMovies
 * @kind function
 * @requires passport module for authentication
 * @requires movies mongoose.Model
 * @returns a JSON object holding data about all the movies
 */
app.get('/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
    Movies.find()
    .then((movies) => {
        res.status(201).json(movies);
    })
    .catch((error) => {
        res.status(500).send('Error ' + error);
    })
});

/**
 * Function to add user favorite movie
 * @method POST to endpoint '/users/:Username/movies/:MovieID'
 * @name addFavorite
 * @kind function
 * @requires passport module for authentication
 * @requires Users mongoose.Model
 * @returns a JSON object with updated user information
 */
app.post('/users/:username/movies/:movieID', passport.authenticate('jwt', { session: false }), (req, res) => {
    Users.findOneAndUpdate({ Username: req.params.username }, {
        $addToSet: { FavoriteMovies: req.params.movieID },
    }, 
    { new: true },
    (error, updatedUser) => {
        if (error) {
            console.log(error);
            res.status(500).send('Error ' + error);
        } else {
            res.json(updatedUser);
        }
    });
});

/**
 * Function to delete user favorite movie
 * @method DELETE to endpoint '/users/:Username/movies/:MovieID'
 * @name deleteFavorite
 * @kind function
 * @requires passport module for authentication
 * @requires Users mongoose.Model
 * @returns a JSON object with updated user information
 */
app.delete('/users/:username/movies/:movieID', passport.authenticate('jwt', { session: false }), (req, res) => {
    Users.findOneAndUpdate({ Username: req.params.username }, {
        $pull: { FavoriteMovies: req.params.movieID },
    }, 
    { new: true },
    (error, updatedUser) => {
        if (error) {
            console.log(error);
            res.status(500).send('Error ' + error);
        } else {
            res.json(updatedUser);
        }
    });
});

/**
 * @method GET to endpoint '/movies/:title'
 * @name getMovie
 * @kind function
 * @requires passport module for authentication
 * @requires movies mongoose.Model
 * @returns Returns a JSON object holding data about a single movie by title
 */
app.get('/movies/:title', passport.authenticate('jwt', { session: false }), (req, res) => {
    Movies.findOne({ Title: req.params.title })
    .then((movie) => {
        if (movie) {
            res.status(201).json(movie);
        } else {
            res.status(400).send('Movie not found.');
        }
    })
    .catch((error) => {
        console.log(error);
        res.status(500).send('Error: ' + error);
    });
});

/**
 * @method GET to endpoint '/movies/genre/:ganreName'
 * @name getGenre
 * @kind function
 * @requires passport module for authentication
 * @requires movies mongoose.Model
 * @returns a JSON object holding data about ganre by name
 */
app.get('/movies/genre/:genreName', passport.authenticate('jwt', { session: false }), (req, res) => {
    Movies.findOne({ "Genre.Name": req.params.genreName })
    .then((movie) => {
        if (movie) {
            res.status(201).json(movie.Genre.Description);
        } else {
            res.status(400).send('Genre not found.');
        }
    })
    .catch((error) => {
        console.log(error);
        res.status(500).send('Error: ' + error);
    });
});

/**
 * @method GET to endpoint '/movies/directors/:direcrorName'
 * @name getDirector
 * @kind function
 * @requires passport module for authentication
 * @requires movies mongoose.Model
 * @returns a JSON object holding data about director by name
 */
app.get('/movies/directors/:directorName', passport.authenticate('jwt', { session: false }), (req, res) => {
    Movies.findOne({ "Director.Name": req.params.directorName })
    .then((movie) => {
        if (movie) {
            res.status(201).json(movie.Director);
        } else {
            res.status(400).send('Director not found.');
        }
    })
    .catch((error) => {
        console.log(error);
        res.status(500).send('Error: ' + error);
    });
});

/**
 * Middleware for handling errors.
 */
app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(500).send('Something broke!');
});

/**
 * Start the server and listen on provided port.
 */
app.listen(port, '0.0.0.0',() => {
    console.log('Listening on Port ' + port);
});

module.exports.handler = serverless(app);
