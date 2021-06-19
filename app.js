//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const homeStartingContent = "Create a New Post";
const aboutContent = ""
const contactContent = "";
let requestedPostID = "";
const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb+srv://admin-surya:' + process.env.MongoDB_PW + '@cluster0.el2dx.mongodb.net/blogDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: true
});
mongoose.set('useCreateIndex', true);
const blogSchema = new mongoose.Schema({
  blogData: [{
    title: String,
    body: String
  }],
  username: String,
  password: String,
  googleId: String,
});
blogSchema.plugin(passportLocalMongoose);
blogSchema.plugin(findOrCreate);
const Blog = new mongoose.model("Blog", blogSchema);
passport.use(Blog.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home"
  },
  function(accessToken, refreshToken, profile, cb) {
    Blog.findOrCreate({
      googleId: profile.id,
      username: profile.displayName
    }, function(err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res) {
  res.render("signup");
});
app.get("/home", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("personalhome", {
      homeStartingContent: homeStartingContent,
      posts: req.user.blogData
    });
  } else res.redirect("/login");
});
app.get("/posts/:postID", function(req, res) {

  if (req.isAuthenticated()) {
    const requestedPostID = req.params.postID;

    const userID = req.user._id;

    Blog.findOne({
      _id: userID
    }, function(err, results) {
      if (err) console.log(err);
      else {
        var foundUserBlogs = results.blogData;
        // var foundUserPosts = foundUserBlogs.filter(function(item) {
        //   return item._id == requestedPostID;
        // });
        var foundUserPost={};
        foundUserBlogs.forEach(function(blog){
          if(blog._id==requestedPostID){foundUserPost=blog};
        });
        // console.log(foundUserPost);
        res.render("post", {
          post: foundUserPost,
          requestedPostID: requestedPostID
        });
      }


    });
  } else res.redirect("/login");
});




app.get("/home/compose", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("compose");
  } else res.redirect("/login");
});
app.post("/home/compose",function(req, res) {
  // console.log(req.user.blogData);
  const newPost = {
    title: req.body.postTitle,
    body: req.body.postBody
  }
   Blog.findOne({
     _id:req.user._id
  }, function(err,foundUser) {
       foundUser.blogData.push(newPost);
       foundUser.save();
       res.redirect("/home");

      // req.session.save(function(err){
      //   console.log(err);
      //  {
      //   $push: {
      //     'blogData':newPost
      //   }
      // }, {returnNewDocument:true},
      // })
      // console.log(req.user.blogData);
  });


    // console.log(foundUser);
    // console.log(req.user.blogData);



});
// app.param('postId', function (req, res, next, id) {
//
//   Post.findById(id, function (err, post) {
//     if (err) return next(err);
//     if (!post) return next('route');
//     req.post = post;
//   });
//
// });
app.post("/posts/delete", function(req, res) {
    const postID = req.body.deletePost;
    // console.log(postID);
    Blog.findOneAndUpdate({'_id':req.user._id},{$pull:{'blogData':{'_id':postID}}}, function(err,post) {
      if (err) {
        console.log(err);
      } else res.redirect("/home");
    });
});
app.get("/register", function(req, res) {
  res.render("register");
});
app.post("/register", function(req, res) {
  Blog.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {});
    }
  })
});
app.get("/login", function(req, res) {
  res.render("login");
});
app.post("/login", passport.authenticate("local", {
  successRedirect: '/home',
  failureRedirect: '/login',
  failureFlash: true
}));
app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile"]
  })
);
app.get("/auth/google/home",
  passport.authenticate("google", {
    failureRedirect: "/login"
  }),
  function(req, res) {
    res.redirect("/home");
  });
  app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
  });
app.listen(3000, function() {
  console.log("Server started on port 3000");
});
