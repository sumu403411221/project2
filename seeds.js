var mongoose=require("mongoose");
var Campground  =require("./models/campground");
var Comment     =require("./models/comment");

var data=[
	{name:"sumit", image:"https://tse4.mm.bing.net/th?id=OIP.OV-jMdl7xCfxT94DZaAK-wHaGX&pid=Api&P=0&w=181&h=157", description: "blag bah blah"},
	{name:"sumu", image:"", description: "blag bah blah"},
	{name:"hgaf", image:"https://tse3.mm.bing.net/th?id=OIP.7X4Va17-QP2hTVS1asnaVgHaE4&pid=Api&P=0&w=255&h=169", description: "blag bah blah"}
]


function seedDB(){
	Campground.remove({},function(err){
		if(err){
			console.log(err);
		}
			console.log("removed");
		data.forEach(function(seed){
			Campground.create(seed,function(err,campground){
				if(err){
					console.log(err);
				}else{
					console.log("added new campground");
					Comment.create(
					{
						text: "hcjf",
						author: "sumu"
					},function(err,comment){
						if(err){
							comsole.log(err);
						}else{
							campground.comments.push(comment);
							campground.save();
							console.log("new comment");
			
						}
					})
				}
			})
	})
	}
	
	
	
	


module.exports =seedDB;