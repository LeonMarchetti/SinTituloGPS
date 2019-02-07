var latitud  = 0;
var longitud = 0;
var tiempo	 = 0;

function receivedEvent(id)
{
	$(id).find(".listening").attr("style", "display:none");
	$(id).find(".received").attr("style", "display:block");
    console.log('Received Event: ' + id);
}

$(document).ready(function()
{
//	$(document).bind("deviceready", app.onDeviceReady);
	$(document).bind("deviceready", function()
	{
		receivedEvent("#deviceready");
		window.setInterval(function() 
		{
        	navigator.geolocation.getCurrentPosition(
				function(posicion)	// Éxito
				{
					$("#tdLat").text(posicion.coords.latitude);
					$("#tdLon").text(posicion.coords.longitude);
					$("#tdLatLonT").text(tiempo + "s");
					$("#tdError").text("");
					
					console.log("[" + tiempo + "s] (" + posicion.coords.latitude + 
							", " + posicion.coords.longitude + ")");
				},
				function(error)	// Error
				{
					$("#tdLat").text("");
					$("#tdLon").text("");
					$("#tdError").text(error.message);
				},
				{
					enableHighAccuracy: true
				});
        	
        	// Actualizar span de tiempo:
        	tiempo++;  
        	$("#tdTiempo").text(tiempo + "s");
    	}, 
    	1000);
	});
	
	$("#btnGuardar").click(function()
	{
		$("#tdLatGuardar").text($("#tdLat").text());
		$("#tdLonGuardar").text($("#tdLon").text());
	});
});