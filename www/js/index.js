var actualizacion   = 0;
var watchID         = null;
var db              = null;

var ids = [];

var sql_crear_tabla = "Create Table If Not Exists Posicion(" + 
                      "id Integer Primary Key,latitud Float Not Null," + 
                      "longitud Float Not Null,descripcion Text Default \"\");";
var sql_sel_pos_all = "Select * From Posicion";
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
            tx.executeSql(sql_sel_pos_all, [], 
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
function toRad(g)
{
    return g * Math.PI / 180;
}

function distancia(lat1, lon1, lat2, lon2) 
{
    var R    = 6371; // Radius of the earth in km
    /*var dLat = (lat2-lat1).toRad();  // Javascript functions in radians
    var dLon = (lon2-lon1).toRad(); 
    var a    = Math.sin(dLat/2) * Math.sin(dLat/2) +
                   Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) * 
                   Math.sin(dLon/2) * Math.sin(dLon/2);*/ 
    var dLat = toRad(lat2 - lat1);  // Javascript functions in radians
    var dLon = toRad(lon2 - lon1); 
    var a    = Math.sin(dLat/2) * Math.sin(dLat/2) +
                   Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
                   Math.sin(dLon/2) * Math.sin(dLon/2); 
    var c    = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d    = R * c; // Distance in km
    
    return d;
}

function onWatchPosition(pos)
{
    var latitud_actual  = pos.coords.latitude;
    var longitud_actual = pos.coords.longitude;
    
    $("#tdLat").text(latitud_actual);
    $("#tdLon").text(longitud_actual);
    $("#tdError").text("");
    
    db.transaction(function(tx)
    {
        tx.executeSql(sql_sel_pos_all, [],
            function(tx, rs)
            {
                for (var i = 0; i < rs.rows.length; i++)
                {
                    var posicion = rs.rows.item(i);
                    var d        = distancia(
                                       latitud_actual, longitud_actual,
                                       posicion.latitud, posicion.longitud);
                    
                    if (d <= 1)
                    {
                        /* 
                         * Si el id de la alarma no está en la lista, 
                         * significa que recién acabo de llegar al área de 
                         * la alarma y entonces tengo que lanzar la 
                         * notificación.
                         */
                        if (!ids.includes(posicion.id)) 
                        {
                            navigator.notification.beep(1);
                            navigator.notification.alert(
                                posicion.descripcion, null, "SinTituloGPS");
                            console.log("Posicion encontrada: [" + 
                                posicion.id + "]");
                            
                            ids.push(posicion.id);
                        }
                    }
                    else
                    {
                        /* 
                         * Si el id está actualmente en la lista de ids,
                         * entonces significa que acabo de salir de la zona 
                         * de la alarma y puedo sacar el id de la lista.
                         */
                        var j = ids.indexOf(posicion.id);
                        if (j > -1)
                        {
                            ids.splice(j, 1);
                        }
                    }
                }
            },
            function(tx, error)
            {
                console.log(error.message);
            });
    });
}

function onWatchPositionError(error)
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
}

function iniciarWatch()
{
    $("#btnIniciar").hide();
    $("#btnDetener").show();
    
    watchID = navigator.geolocation.watchPosition(
        onWatchPosition, 
        onWatchPositionError, 
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