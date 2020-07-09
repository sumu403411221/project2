var trigger=document.querySelector(".trigger");
var modal=document.querySelector(".Modal");
var closeButton=document.querySelector(".closeButton");


trigger.addEventListener("click",function(){
	modal.classList.toggle("show-modal");
})

closeButton.addEventListener("click",function(){
		modal.classList.toggle("show-modal");

})
