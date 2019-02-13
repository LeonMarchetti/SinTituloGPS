var actualizacion   = 0;
var watchID         = null;
var db              = null;

var sql_crear_tabla = "Create Table If Not Exists Posicion(" + 
                      "id Integer Primary Key,latitud Float Not Null," + 
                      "longitud Float Not Null,descripcion Text Default \"\");";
var sql_sel_pos     = "Select * From Posicion";
var sql_ins_pos     = "Insert Into Posicion (latitud, longitud, descripcion) Values (?, ?, ?)";

// Indicar que Cordova ya está cargado.
function receivedEvent(id)
{
	$(id).find(".listening").attr("style", "display:none");
	$(id).find(".received").attr("style", "display:block");
    console.log('Received Event: ' + id);
}

function habilitarGuardar()
{
    console.log("habilitarGuardar()");
    
    // Mostrar elementos:
    $("#divGuardar").show();
    $("#btnGuardar").prop("disabled", true);
    
    // Valores iniciales para guardar:
    $("#inGuardarLat").val($("#tdLat").text());
    $("#inGuardarLon").val($("#tdLon").text());
    
    $("html, body").animate(
    {
        scrollTop: ($("#divGuardar").offset().top)
    }, 500);
}

function guardarAlarma()
{
    console.log("guardarAlarma()");

    var latitud = $("#inGuardarLat").val();
    var longitud = $("#inGuardarLon").val();
    var descripcion = $("#inGuardarDesc").val();
    
    db.transaction(
        function(tx) 
        {
            tx.executeSql(sql_ins_pos, [latitud, longitud, descripcion]);
        }, 
        function(error) 
        {
            console.log(error.message);
        }, 
        function() 
        {
            console.log("Insercion OK");
            consultarAlarmas();
        });
    ocultarDivGuardarAlarma()
}

function cancelarGuardarAlarma()
{
    ocultarDivGuardarAlarma()
}

function ocultarDivGuardarAlarma()
{
    $("#divGuardar").hide();
    $("#btnGuardar").prop("disabled", false);
}

function mostrarAlarmas()
{
    $("#divAlarmas").show();
    $("#btnMostrar").hide();
    $("#btnOcultar").show();
    
    consultarAlarmas();
    
    $("html, body").animate(
    {
        scrollTop: ($("#divAlarmas").offset().top)
    }, 500);
}

function consultarAlarmas()
{
    $("#tbodyAlarmas").empty();
    
    db.transaction(function(tx) 
        {
            tx.executeSql(sql_sel_pos, [], 
                function(tx, rs)
                {
                    var celdas = "";
                    for (var i = 0; i < rs.rows.length; i++)
                    {
                        celdas += 
                            "<tr>" +
                            "<td>" + rs.rows.item(i).id + "</td>" +
                            "<td>" + rs.rows.item(i).latitud + "</td>" +
                            "<td>" + rs.rows.item(i).longitud + "</td>" +
                            "<td>" + rs.rows.item(i).descripcion + "</td>" +
                            "</tr>";
                    }
                    
                    $("#tbodyAlarmas").append(celdas);
                    $("#tbodyAlarmas td:first-child").click(borrarAlarma);
                },
                function(tx, error) 
                {
                    console.log(error.message);
                });
        },
        function(tx, error)
        {
            console.log(error.message);
        });
}

function ocultarAlarmas()
{
    $("#divAlarmas").hide();
    $("#btnMostrar").show();
    $("#btnOcultar").hide();
}

function borrarAlarma(evento)
{
    var id = $(evento.target).text();
    console.log("id = " + id);
    
    navigator.notification.confirm("¿Desea borrar esta alarma?", function(i)
    {
        if (i == 1)
        {
            db.transaction(
                function(tx) 
                {
                    tx.executeSql("Delete From Posicion Where id=?", [id]);
                },
                function(error)
                {
                    console.log(error.message);
                },
                function()
                {
                    console.log("Posicion con id=" + id + " borrada.");
                    $(evento.target).parent().remove();
                });
        }
    }, "SinTituloGPS", ["Borrar", "Cancelar"]);
}

// watchPosition ===============================================================
function iniciarWatch()
{
    $("#btnIniciar").hide();
    $("#btnDetener").show();
    
    watchID = navigator.geolocation.watchPosition(
        function(posicion)
        {
            $("#tdLat").text(posicion.coords.latitude);
            $("#tdLon").text(posicion.coords.longitude);
            $("#tdError").text("");
            
            /*console.log("[" + actualizacion + "] (" + posicion.coords.latitude + 
                ", " + posicion.coords.longitude + ")");*/
            
            actualizacion++;
        }, 
        function(error)
        {
            var codigo = "Desconocido";
            switch (error.code)
            {
                case PositionError.PERMISSION_DENIED:
                    codigo = "Permiso denegado";
                    break;
                case PositionError.POSITION_UNAVAILABLE:
                    codigo = "Posición no disponible";
                    break;
                case PositionError.TIMEOUT:
                    codigo = "Tiempo agotado";
                    break;
            }
            $("#tdError").text(codigo + " - " + error.message);
        }, 
        {
            timeout:            30000,
            enableHighAccuracy: true,
            maximumAge:         1000
        }); 
    
    console.log("watchPosition iniciado para ID=" + watchID);
}

function terminarWatch()
{
    $("#btnIniciar").show();
    $("#btnDetener").hide();
    
    navigator.geolocation.clearWatch(watchID);
    console.log("watchPosition terminado para ID=" + watchID);
    watchID = null;
}

$(document).ready(function()
{	
	$(document).bind("deviceready", function()
	{
	    db = window.sqlitePlugin.openDatabase(
        {
            name:     "alarmas.db",
            location: "default"
        });
	    
	    db.transaction(
	        function(tx) 
	        {
	            tx.executeSql(sql_crear_tabla);
	        }, 
	        function(error) 
	        {
	            console.log(error.message);
	        }, 
	        function() 
	        {
	            console.log("Base de datos inicializada");
	        });
	    
		receivedEvent("#deviceready");
		
	    $("#btnIniciar").click(iniciarWatch);
	    $("#btnDetener").click(terminarWatch);
	    $("#btnGuardar").click(habilitarGuardar);
	    $("#btnMostrar").click(mostrarAlarmas);
	    $("#btnOcultar").click(ocultarAlarmas);
	    $("#btnGuardarCancelar").click(cancelarGuardarAlarma);
	    $("#btnGuardarGuardar").click(guardarAlarma);
	});
});