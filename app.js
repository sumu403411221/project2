var express     =require("express");
var app         =express();
var flash       =require("connect-flash");
var bodyParser  =require("body-parser");
var mongoose    =require("mongoose");
var Campground  =require("./models/campground");
var Comment     =require("./models/comment");
var passport=require("passport");
var LocalStrategy=require("passport-local");
var User   =require("./models/user"); 
var Notification = require("./models/notification");
var methodOverride=require("method-override");


//var seedDB      =require("./seeds");
 
mongoose.connect("mongodb+srv://sumu:403411221@cluster0-6mkxm.mongodb.net/yelpcamp?retryWrites=true&w=majority",{
	useNewUrlParser: true,
    useCreateIndex: true
}).then(() =>{
	console.log("db connected");
}).catch(err =>{
	console.log("error",err.message);
});
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(methodOverride("_method"));
app.use(flash());

//PASSPORT CONFIGUARTION
app.use(require("express-session")({
	secret:"physics",
	resave:false,
	saveUninitialized:false
}));

require('locus');
 


 

app.use(passport.initialize());

app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(async function(req,res,next){
	res.locals.currentUser=req.user;
	if(req.user){
		try{
			let user = await User.findById(req.user._id).populate("notifications", null, {isRead: false}).exec();
			res.locals.notifications = user.notifications.reverse();
			
		}catch(err){
			console.log(err.message);
		}
	}
	res.locals.error=req.flash("error");
	res.locals.success=req.flash("success");
	next();
})


//seedDB();

app.get("/",function(req,res){
	res.render("landing");
})

app.get("/campgrounds",function(req,res){
	
	
	Campground.find({},function(err,allCampgrounds){
		if(err){
			console.log(err);
		}else{
			res.render("campgrounds/campgrounds",{campgrounds:allCampgrounds,currentUser:req.user});
		}
	})
	
	
	
})

app.post("/campgrounds",isLoggedIn,async function(req,res){
	var name=req.body.name;
	var image=req.body.image;
	var desc=req.body.description;
	var author={
		id: req.user._id,
		username: req.user.username
	}
	var newCampground={name:name,image:image,description:desc,author:author};
	try{
		let campground = await Campground.create(newCampground);
		let user = await User.findById(req.user._id).populate("followers").exec();
		let newNotification = {
			username: req.user.username,
			campgroundId: campground._id
		}
		for(const follower of user.followers){
			let notification = await Notification.create(newNotification);
			follower.notifications.push(notification);
			follower.save();
			
		}
		res.redirect(`/campgrounds/${campground._id}`);
	    
	}catch(err){
		req.flash("error",err.message);
		res.redirect("back");
    }
	
	// Campground.create(newCampground,function(err,newcamp){
	// 	if(err){
	// 		console.log(err);
	// 	}else{
	// 		console.log(newcamp);
	// 		res.redirect("/campgrounds");
	// 	}
	// })
	
})

app.get("/campgrounds/new",isLoggedIn,function(req,res){
	res.render("campgrounds/new");
})

app.get("/campgrounds/:id",function(req,res){
	Campground.findById(req.params.id).populate("comments likes").exec(function(err,find){
		if(err){
			console.log(err);
		}else{
			//console.log(find);
			res.render("campgrounds/show",{campground:find});
			console.log(find);
			
		}
	})
	
	
})



//EDIT CAMPGROUND
app.get("/campgrounds/:id/edit",checkCampgroundOwnership,function(req,res){
		Campground.findById(req.params.id,function(err,foundCampground){
				  res.render("campgrounds/edit",{campground:foundCampground});	
			})
	})


//UPDATE CAMPGROUND

app.put("/campgrounds/:id",checkCampgroundOwnership,function(req,res){
	//find and update and redirect show page
	Campground.findByIdAndUpdate(req.params.id,req.body.campground,function(err,updateCampground){
		if(err){
			res.redirect("/campgrounds");
		}else{
			res.redirect("/campgrounds/" + req.params.id);
		}
		
	})
	
})

//DELETE CAMPGROUND

app.delete("/campgrounds/:id",checkCampgroundOwnership,function(req,res){
	Campground.findByIdAndRemove(req.params.id,function(err){
		if(err){
			res.redirect("/campgrounds");
		}else{
			res.redirect("/campgrounds");
		}
		
	})
})

//==================================================
//LIKE route
//==================================================

app.post("/campgrounds/:id/like",isLoggedIn,function(req,res){
	Campground.findById(req.params.id,function(err,foundCampground){
		if(err){
			res.redirect("back");
		}else{
			
			
			//check req.user._id in milgaya.likes
			 var foundUserLike = foundCampground.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) { 
			foundCampground.likes.pull(req.user._id);
        } else {
            // user already liked, removing like
           
            // adding the new user like
            foundCampground.likes.push(req.user);
			
					 

			
			
        }
			
		
			foundCampground.save(function(err){
				if(err){
					res.redirect("back");
				}else{
					res.redirect("/campgrounds/"+ foundCampground._id);
					
				}
			});
			
		}
			
			
			
		
    })
})

// my profile

app.get("/my/:id",isLoggedIn,function(req,res){
	User.findById(req.params.id).populate("followers").exec(function(err,foundUser){
		if(err){
			req.flash("error","something went wrong");
			res.redirect("/");
		}else{
			
			Campground.find().where("author.id").equals(foundUser._id).exec(function(err,campgrounds){
				if(err){
				   req.flash("error","something went wrong");
					res.redirect("/");
	
				}
				res.render("users/show",{user:foundUser,campgrounds:campgrounds});
			})
			
			console.log(foundUser);
		}

	})
})
  
// user  profile
app.get("/user/:id",isLoggedIn,async function(req,res){
	try{
		user = await  User.findById(req.params.id).populate("followers").exec();
	    var follow=false;
		for(var i=0;i<user.followers.length;i++){
			if(req.user._id.equals(user.followers[i]._id)){
				 follow= true;
				 break;
			 }
		 }
		 res.render("profile",{ user : user, follow:follow });
				  
	}catch(err){
	     req.flash("error",err.message);
		return res.redirect("back");	
	}
	
	     // User.findById(req.params.id).populate("followers").exec(function(err,user){
		 // if(err){
		 // req.flash("error", err.message);
		 //         return res.redirect("back");
		 // }else{
		 // var follow=false;
		 // for(var i=0;i<user.followers.length;i++){
		 // if(req.user._id.equals(user.followers[i]._id)){
		 // follow= true;
		 // break;
						
		 // }
		 // }
				  
		 // res.render("profile",{ user : user, follow:follow });
		 // }
		 // });
		
	})

//follow user

app.get("/follow/:id",isLoggedIn,async function(req,res){
	try{
		let user = await User.findById(req.params.id);
		user.followers.push(req.user._id);
		user.save();
		req.flash("success", "successfully followed"  +  user.username + "!");
		res.redirect("/user/" + req.params.id)
	}catch(err){
		req.flash("error",err.message);
		return res.redirect("back");
	}
})

//view all notofication

app.get("/notifications",isLoggedIn,async function(req,res){
	try{
		let user = await User.findById(req.user._id).populate({
			path: "notifications",
			options: { sort: { "_id": -1} }
		}).exec();
		let allNotifications = user.notifications;
		res.render("notifications/index",{allNotifications});
	}catch(err){
		req.flash("error", err.message);
		res.redirect("back");
	}
})

//handle notifications

app.get("/notifications/:id",isLoggedIn,async function(req,res){
	try{
		let notification = Notification.findById(req.params.id);
		notification.isRead = true;
		notification.save();
		res.redirect(`/campgrounds/${notification.campgroundId}`);
	}catch(err){
		req.flash("error", err.message);
		res.redirect("back");
	}
})


//=========================================================
//comments routes
//=========================================================

app.get("/campgrounds/:id/comments/new",isLoggedIn,function(req,res){
	Campground.findById(req.params.id,function(err,campground){
		if(err){
			console.log(err);
		}else{
			res.render("comments/new",{campground:campground});
		}
	})
	
})

app.post("/campgrounds/:id/comments",function(req,res){
	Campground.findById(req.params.id,function(err,campground){
			if(err){
			res.redirect("/campgrounds");
		}else{
		    Comment.create(req.body.comment,function(err,comment){
				if(err){
					console.log(err);
				}
					
				else{
					//add username and id
					comment.author.id=req.user._id;
					comment.author.username=req.user.username;
					console.log(req.user);
					//save comment
					comment.save();
					campground.comments.push(comment);
					campground.save();
					console.log(comment);
					
					res.redirect("/campgrounds/" + campground._id);
				}
				
			})
	    }
	})
	
})


app.get("/campgrounds/:id/comments/:comment_id/edit",checkCommentOwnership,function(req,res){
	Comment.findById(req.params.comment_id,function(err,foundComment){
		if(err){
			res.redirect("back");
		}else{
			res.render("comments/edit",{campground_id:req.params.id,comment:foundComment});
		}
	})
	
})

//COMMENT UPDATE

app.put("/campgrounds/:id/comments/:comment_id",checkCommentOwnership,function(req,res){
	Comment.findByIdAndUpdate(req.params.comment_id,req.body.comment,function(err,updatedComment){
		if(err){
			res.redirect("back");
		}else{
			res.redirect("/campgrounds/"+req.params.id);
		}
	})
})

//DELETE COMMENT

app.delete("/campgrounds/:id/comments/:comment_id",checkCommentOwnership,function(req,res){
	//find by id and remove
	Comment.findByIdAndRemove(req.params.comment_id,function(err){
		if(err){
			res.redirect("back");
			
		}else{
			res.redirect("/campgrounds/"+req.params.id);
		}
	})
	
})

//AUTH ROUTE

app.get("/register",function(req,res){
	res.render("register");
})

app.post("/register",function(req,res){
	var newUser=new User({username:req.body.username});
	User.register(newUser,req.body.password,function(err,user){
		if(err){
			console.log(err);
			return res.render("register");
		}
		passport.authenticate("local")(req,res,function(){
			res.redirect("/campgrounds");
		})
	})
})



//LOGIN FORM
app.get("/login",function(req,res){
	res.render("login");
})

app.post("/login",passport.authenticate("local",
   {
	  successRedirect:"/campgrounds",
	  failureRedirect:"/login"
   }),function(req,res){
	
})


//LOGOUT

app.get("/logout",function(req,res){
	req.logout();
	req.flash("success","Logged you out")
	res.redirect("/campgrounds");
})

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
	req.flash("error","please Login first");
    res.redirect("/login");
}

function checkCampgroundOwnership(req,res,next){
	if(req.isAuthenticated()){
		Campground.findById(req.params.id,function(err,foundCampground){
			if(err){
				res.redirect("back");
			}else{
				//does user own campground
				if(foundCampground.author.id.equals(req.user._id)){
					next();
				}else{
					res.redirect("back");
				}
					
			}
			
		})
	}else{
		console.log("login");
		res.redirect("back");
	}
}

function checkCommentOwnership(req,res,next){
	if(req.isAuthenticated()){
		Comment.findById(req.params.comment_id,function(err,foundComment){
			if(err){
				res.redirect("back");
			}else{
				//does user own campground
				if(foundComment.author.id.equals(req.user._id)){
					next();
				}else{
					res.redirect("back");
				}
					
			}
			
		})
	}else{
		
		res.redirect("back");
	}
}




app.listen(process.env.PORT || 3000,function(){
	console.log("server started");
})