'use strict';

// Imports
let express = require('express');
let exphbs = require('express-handlebars');
let mongoose = require('mongoose');
let bodyParser = require('body-parser');
let cookieParser = require('cookie-parser');
let jwt = require('jsonwebtoken');
let morgan = require('morgan');

// Collections
let User = require('./models/users');
let Tweet = require('./models/tweets');

// Express Settings
let app = express();
let port = process.env.PORT || 3000;
app.set('APP_SECRET', 'SUPER-SECRET-KEY');
app.use('/static', express.static(__dirname + '/client/static'));
app.set('views', 'client/views/');

// Body Parser
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Cookie Parser
app.use(cookieParser());

// View Engine Settings
let helpers = require('./client/library/helpers');
let hbs = exphbs.create({
  defaultLayout: 'main',
  extname: '.hbs',
  helpers: helpers,
  layoutsDir: 'client/views/layouts/',
  partialsDir: 'client/views/common/'
});

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');
//app.enable('view cache');

// Mongoose
// Config
mongoose.connect('mongodb://localhost/zwitter');
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log('LOGGED | MongoDB Connected - ' + new Date());
});

// Router
let routerPublic = express.Router();
let routerLoggedin = express.Router();

routerPublic.use((request, response, next) => {
  let token = request.body.token || request.query.token || request.headers['x-access-token'] || request.cookies.token;

  if (token) {
    request.user = jwt.verify(token, app.get('APP_SECRET'));
  } else {
    request.user = {};
  }

  next();
});

routerLoggedin.use((request, response, next) => {
  if (typeof request.user._id === 'undefined') {
    response.redirect('/login');
  } else {
    next();
  }
});

// Middleware
let log = (req, res, next) => {
  console.log('LOGGED | Middleware - ' + new Date());
  next();
};
app.use(log);
app.use(morgan('dev'));

// Routes
// Home (list tweets)
routerPublic.get('/', (request, response) => {
  Tweet.find({}).sort('-createdAt').exec(function (error, documents) {
    response.render('pages/home', { user: request.user, tweets: documents });
  });
});

// Tweet
// Form
routerLoggedin.get('/tweet', (request, response) => {
  response.render('pages/tweet', { user: request.user });
});

// Submit Form
routerLoggedin.post('/tweet', (request, response) => {
  if (request.body.text !== '') {
    let tweet = {
      text: request.body.text,
      userId: request.user._id,
      createdAt: new Date()
    };

    Tweet.create(tweet, (error, document) => {
      if (document._id) {
        response.redirect('/');
      }
    });
  } else {
    response.redirect('/tweet');
  }
});

// User
// Login
// Form
routerPublic.get('/login', (request, response) => {
  let message = request.query.message;

  response.render('user/login', { user: request.user, message: message });
});

// Submit
routerPublic.post('/login', (request, response) => {
  User.findOne({ username: request.body.username }, (error, document) => {
    if (error) {
      throw error;
    } else {
      if (!document) {
        let message = 'No user exists with this username.';

        response.redirect('/login/?message=' + encodeURIComponent(message));
      } else {
        if (document.password !== request.body.password) {
          let message = 'The password is incorrect.';

          response.redirect('/login/?message=' + encodeURIComponent(message));
        } else {
          let token = jwt.sign(document.toObject(), app.get('APP_SECRET'));

          response.cookie('token', token);

          response.redirect('/tweet');
        }
      }
    }
  });
});

// Register
// Form
routerPublic.get('/register', (request, response) => {
  let message = request.query.message;

  response.render('user/register', { user: request.user, message: message });
});

// Submit
routerPublic.post('/register', (request, response) => {
  if (request.body.username !== '') {
    // Check user exists
    User.findOne({ username: request.body.username }, (error, document) => {
      if (!document) {
        // User does not exists

        let user = {
          username: request.body.username,
          password: request.body.password,
          createdAt: new Date()
        };

        User.create(user, function (errorCreate, documentCreate) {
          if (documentCreate._id) {
            response.redirect('/login');
          }
        });
      } else {
        // User already exists

        let message = 'The username is taken. Please enter something else.';

        response.redirect('/register/?message=' + encodeURIComponent(message));
      }
    });
  } else {
    response.redirect('/register');
  }
});

// Logout
routerPublic.get('/logout', (request, response) => {
  response.clearCookie('token');

  response.redirect('/');
});

// Apply routers
app.use(routerPublic);
app.use(routerLoggedin);

// Boot Server
let server = app.listen(3000, () => {
  let host = server.address().address;

  let port = server.address().port;

  console.log('Server running on http://%s:%s', host, port);
});