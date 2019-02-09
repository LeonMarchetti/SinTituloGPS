var actualizacion = 0;
var watchID = null;

// Indicar que Cordova ya está cargado.
function receivedEvent(id)
{
	$(id).find(".listening").attr("style", "display:none");
	$(id).find(".received").attr("style", "display:block");
    console.log('Received Event: ' + id);
}

function guardarPosicion()
{
    $("#tdLatGuardar").text($("#tdLat").text());
    $("#tdLonGuardar").text($("#tdLon").text());
}

// watchPosition ===============================================================
function iniciarWatch()
{
    if (!watchID)
    {
        watchID = navigator.geolocation.watchPosition(
            function(posicion)
            {
                $("#tdLat").text(posicion.coords.latitude);
                $("#tdLon").text(posicion.coords.longitude);
                $("#tdLatLonT").text(actualizacion);
                $("#tdError").text("");
                
                console.log("[" + actualizacion + "] (" + posicion.coords.latitude + 
                    ", " + posicion.coords.longitude + ")");
                
                actualizacion++;
            }, 
            function(error)
            {
                $("#tdError").text(error.message);
            }, 
            {
                timeout:            30000,
                enableHighAccuracy: true,
                maximumAge:         1000
            }); 
        
        console.log("watchPosition iniciado para ID=" + watchID);
    }
}

function terminarWatch()
{
    if (watchID)
    {
        navigator.geolocation.clearWatch(watchID);
        console.log("watchPosition terminado para ID=" + watchID);
        watchID = null;
    }
}

$(document).ready(function()
{	
	$(document).bind("deviceready", function()
	{
		receivedEvent("#deviceready");
		
		$("#btnGuardar").click(guardarPosicion);
	    $("#btnIniciar").click(iniciarWatch);
	    $("#btnDetener").click(terminarWatch);
	});
});