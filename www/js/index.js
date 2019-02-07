var tiempo = 0;

// Indicar que Cordova ya está cargado.
function receivedEvent(id)
{
	$(id).find(".listening").attr("style", "display:none");
	$(id).find(".received").attr("style", "display:block");
    console.log('Received Event: ' + id);
}

// Obtener cada 10 segundos la posición del dispositivo.
function sondearPosicion()
{
	navigator.geolocation.getCurrentPosition(
		getCurrentPositionExito,
		getCurrentPositionError,
		{ enableHighAccuracy: true });
    	
	// Actualizar span de tiempo:
	tiempo++;  
	$("#tdTiempo").text(tiempo + "s");
}

function getCurrentPositionExito(posicion)
{
	$("#tdLat").text(posicion.coords.latitude);
	$("#tdLon").text(posicion.coords.longitude);
	$("#tdLatLonT").text(tiempo + "s");
	$("#tdError").text("");
	
	console.log("[" + tiempo + "s] (" + posicion.coords.latitude + 
			", " + posicion.coords.longitude + ")");
}

function getCurrentPositionError(error)
{
	$("#tdLat").text("");
	$("#tdLon").text("");
	$("#tdError").text(error.message);
}

function guardarPosicion()
{
	$("#tdLatGuardar").text($("#tdLat").text());
	$("#tdLonGuardar").text($("#tdLon").text());
}

$(document).ready(function()
{	
	$(document).bind("deviceready", function()
	{
		receivedEvent("#deviceready");
		window.setInterval(sondearPosicion, 1000);
	});
	
	$("#btnGuardar").click(guardarPosicion);
});