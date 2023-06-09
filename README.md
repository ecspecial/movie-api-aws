# movie-api-aws

### Description:
This repository is a subversion of the original [API](https://github.com/ecspecial/Movie_API) rewritten for AWS Lambda and deployed as a Docker image. 

### Technologies:
- The Movie API is built using Node.js and Express.
- Data is stored in a MongoDB database and Mongoose is used for data modeling.
- Passport is used for authentication and authorization.
- The API is currently deployed on AWS Lambda.
- DockerDocker is used for containerization of the application.

### Key Features:

- RESTful API architecture
- MongoDB database with Mongoose data modeling
- User authentication and authorization with Passport
- Basic HTTP authentication for first login, followed by JWT-based authentication for subsequent API calls
- Password hashing for user security
- Express library for endpoint routing
- OpenAPI documentation for easy testing and integration

### Getting Started:

To use the Movie API, you will need to first clone the repository, create a Docker Image and deploy it to AWS Lambda repository. After that, you can create a function from image, set environmental variables with AWS console and aquire function URL to work as an API endpoint for fronend applications.

- [API endpoint documentation](https://ecspecial.github.io/Movie_API/public/documentation.html)

### Dependencies:
The Movie API uses several dependencies, including Express, Mongoose, Passport and more. See the package.json file for a full list of dependencies.

### Use Cases:

Currently API is used for the frontend of my [myFlix React](https://github.com/ecspecial/myFlix-client) and [myFlix Angular](https://github.com/ecspecial/myFlix-Angular-client) projects.