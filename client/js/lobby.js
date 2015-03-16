$(document).ready(function(){
    
    $("#btGames").removeClass("btn-inverse");
    $(".gameGroups").hide();
    
    $("#btGames").click(function(){
        $(".discussionGroups").hide();
        $(".gameGroups").show();
        $("#btGames").addClass("btn-inverse");
        $("#btDiscussion").removeClass("btn-inverse");
    });
    
     $("#btDiscussion").click(function(){
        $(".discussionGroups").show();
        $(".gameGroups").hide();
        $("#btGames").removeClass("btn-inverse");
        $("#btDiscussion").addClass("btn-inverse");
    });
    

});