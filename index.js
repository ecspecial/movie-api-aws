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

const Movies = Models.Movie;
const Users = Models.User;
const port = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Use Cross-Origin Resource Sharing on specific domains
const cors = require('cors');
app.use(cors());

// let allowedOrigins = ['http://localhost:8080', 'http://testsite.com'];

// app.use(cors({
//   origin: (origin, callback) => {
//     if(!origin) return callback(null, true);
//     if(allowedOrigins.indexOf(origin) === -1){ // If a specific origin isn’t found on the list of allowed origins
//       let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
//       return callback(new Error(message ), false);
//     }
//     return callback(null, true);
//   }
// }));

let auth = require('./auth.js')(app);
const passport = require('passport');
require('./passport.js');

//mongoose.connect('mongodb://127.0.0.1:27017/myFlixDB', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connect( process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Route all requests for static data in public folder
//app.use(express.static('public'));

// Return default page
app.get('/', (req, res) => {
    res.send('Welcome to my movie_api App!');
});


// Get list of all users
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

// Get user by Username
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


// Add new user
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

// Update user info
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
    if (req.body.Username !== req.params.Username) {
        Users.findOne({ Username: req.params.Username })
            .then((user) => {
                if(!user) {
                    res.status(400).send('User not found.')
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
        Users.findOne({ Username: req.body.Username })
            .then((user) => {
                if(user) {
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
    }


//     Users.findOne({ _id: req.body._id })
//     .then((existingUser) => {
//         if (!existingUser) {
//             res.status(400).send('User not found.');
//         } else if (existingUser && existingUser.Username.toString() !== req.body.Username.toString()) {
//             Users.findOne({ Username: req.body.Username })
//             .then((newUsernameExisting) => {
//                 if (!newUsernameExisting) {
//                     let hashedPassword = req.body.Password ? Users.hashPassword(req.body.Password) : Users.findOne({ Username: req.params.Username }).Password;
//                     Users.findOneAndUpdate({ Username: req.params.Username }, {$set: {
//                             Username: req.body.Username,
//                             Password: hashedPassword,
//                             Email: req.body.Email,
//                             Birthday: req.body.Birthday,
//                             FavoriteMovies: req.body.FavoriteMovies
//                         }
//                         },
//                         { new: true },
//                         (error, updatedUser) => {
//                             if (error) {
//                                 console.log(error);
//                                 res.status(500).send('Error: ' + error);
//                             } else {
//                                 res.status(201).json(updatedUser);
//                             }
//                         }
//                     )} else {
//                         res.status(400).send(req.body.Username + ' already exists.');
//                     }
//             }).catch((error) => {
//                 console.log(error);
//                 res.status(500).send('Error: ' + error);
//                 })
//         }  else if (existingUser && existingUser.Username.toString() === req.body.Username.toString()) {
//                 Users.findOne({ Username: req.body.Username })
//                 .then((existingUsername) => {
//                     if (existingUsername) {
//                         let hashedPassword = req.body.Password ? Users.hashPassword(req.body.Password) : existingUser.Password;
//                         Users.findOneAndUpdate({ Username: req.params.Username }, {$set: {
//                             Username: req.body.Username,
//                             Password: hashedPassword,
//                             Email: req.body.Email,
//                             Birthday: req.body.Birthday,
//                             FavoriteMovies: req.body.FavoriteMovies
//                         }
//                         },
//                         { new: true },
//                         (error, updatedUser) => {
//                             if (error) {
//                                 console.log(error);
//                                 res.status(500).send('Error: ' + error);
//                             } else {
//                                 res.status(201).json(updatedUser);
//                             }
//                         }
//                     )} else {
//                         res.status(400).send('Username must be provided!');
//                     }
//                 }).catch((error) => {
//                     console.log(error);
//                     res.status(500).send('Error: ' + error);
//                     })
//         }      
//         }).catch((error) => {
//             console.log(error);
//             res.status(500).send('Error: ' + error);
//     });
});

// Remove user
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

// Return list of movies upon a request
app.get('/movies', passport.authenticate('jwt', { session: false }), (req, res) => {
    Movies.find()
    .then((movies) => {
        res.status(201).json(movies);
    })
    .catch((error) => {
        res.status(500).send('Error ' + error);
    })
});

// Add movies to the favorites
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

// Delete movies from favorites
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

// Retrurn data about single movie by title
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

// Return description of movie genre
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

// Return director by name
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

// Error handling
app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(500).send('Something broke!');
});

// Listen on port
app.listen(port, '0.0.0.0',() => {
    console.log('Listening on Port ' + port);
});

module.exports.handler = serverless(app);
