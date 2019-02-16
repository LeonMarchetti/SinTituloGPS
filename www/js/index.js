var watchID         = null;
var db              = null;
var ids             = [];

var sql_crear_tabla = "Create Table If Not Exists Posicion(id Integer Primary Key,latitud Float Not Null,longitud Float Not Null,descripcion Text Default \"\",distancia Float Default 0,activo Integer Default True);";
var sql_drop_tabla  = "Drop Table Posicion";
var sql_sel_pos_all = "Select * From Posicion";
var sql_sel_pos_act = "Select * From Posicion Where activo = 1";
var sql_ins_pos     = "Insert Into Posicion(latitud,longitud,descripcion,distancia,activo)Values(?,?,?,?,?)";

// Indicar que Cordova ya está cargado.
function receivedEvent(id)
{
	$(id).find(".listening").attr("style", "display:none");
	$(id).find(".received").attr("style", "display:block");
    console.log('Received Event: ' + id);
}

// Errores: ====================================================================
function manejarError(error) 
{
    console.log(error.message);
}

function manejarErrorTransaccion(tx, error)
{
    console.log(error.message);
}

// Guardar alarma ==============================================================
function habilitarGuardar()
{
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
    var latitud     = $("#inGuardarLat").val();
    var longitud    = $("#inGuardarLon").val();
    var descripcion = $("#inGuardarDesc").val();
    var distancia   = $("#inGuardarDist").val();
    var activo      = $("#inGuardarActivo").prop("checked") ? 1 : 0;
    
    db.transaction(
        (tx) => 
        {
            tx.executeSql(sql_ins_pos, [latitud, longitud, descripcion, distancia, activo]);
        }, 
        manejarError, 
        () => 
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

// Alarmas guardadas ===========================================================
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

function llenarTablaAlarmas(tx, rs)
{
    var celdas = "";
    for (var i = 0; i < rs.rows.length; i++)
    {
        var marcar = (rs.rows.item(i).activo) ? "checked=\"checked\"" : "";
        celdas += 
            "<tr>" +
            "<td>" + rs.rows.item(i).id + "</td>" +
            "<td>" + rs.rows.item(i).latitud + "</td>" +
            "<td>" + rs.rows.item(i).longitud + "</td>" +
            "<td>" + rs.rows.item(i).descripcion + "</td>" +
            "<td>" + rs.rows.item(i).distancia+ "</td>" +
            "<td><input type=\"checkbox\" " + marcar + " /></td>" +
            "</tr>";
    }
    
    $("#tbodyAlarmas").append(celdas);
    $("#tbodyAlarmas td:first-child").click(borrarAlarma);
}

function consultarAlarmas()
{
    $("#tbodyAlarmas").empty();
    
    db.transaction(
        (tx) => 
        {
            tx.executeSql(sql_sel_pos_all, [], llenarTablaAlarmas, manejarErrorTransaccion);
        },
        manejarErrorTransaccion);
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
    
    navigator.notification.confirm("¿Desea borrar esta alarma?", function(i)
    {
        if (i == 1)
        {
            db.transaction(
                (tx) => 
                {
                    tx.executeSql("Delete From Posicion Where id=?", [id]);
                },
                manejarError,
                () =>
                {
                    $(evento.target).parent().remove();
                });
        }
    }, "SinTituloGPS", ["Borrar", "Cancelar"]);
}

// Notificaciones ==============================================================
function notificar(titulo, texto)
{
    cordova.plugins.notification.local.schedule(
    {
        title:      titulo,
        text:       texto,
        foreground: true
    });
}

// Distancia ===================================================================
function toRad(g)
{
    return g * Math.PI / 180;
}

function distancia(lat1, lon1, lat2, lon2) 
{
    var R    = 6371; // Radius of the earth in km
    var dLat = toRad(lat2 - lat1);  // Javascript functions in radians
    var dLon = toRad(lon2 - lon1); 
    var a    = Math.sin(dLat/2) * Math.sin(dLat/2) +
                   Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
                   Math.sin(dLon/2) * Math.sin(dLon/2); 
    var c    = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d    = R * c; // Distance in km
    
    return d;
}

// watchPosition ===============================================================
function onWatchPosition(pos)
{
    var latitud_actual  = pos.coords.latitude;
    var longitud_actual = pos.coords.longitude;
    
    $("#tdLat").text(latitud_actual);
    $("#tdLon").text(longitud_actual);
    $("#tdError").text("");
    
    db.transaction((tx) =>
    {
        tx.executeSql(
            sql_sel_pos_act, [],
            (tx, rs) =>
            {
                for (var i = 0; i < rs.rows.length; i++)
                {
                    var alarma = rs.rows.item(i);
                    var d      = distancia(
                                     latitud_actual, longitud_actual,
                                     alarma.latitud, alarma.longitud);
            
                    if (d <= (alarma.distancia / 1000))
                    {
                       /* 
                        * Si el id de la alarma no está en la lista, 
                        * significa que recién acabo de llegar al área de 
                        * la alarma y entonces tengo que lanzar la 
                        * notificación.
                        */
                        if (!ids.includes(alarma.id)) 
                        {
                            notificar("Alarma GPS", alarma.descripcion);
                            console.log("Posicion encontrada: id=" + alarma.id);
                            ids.push(alarma.id);
                        }
                    }
                    else
                    {
                       /* 
                        * Si el id está actualmente en la lista de ids,
                        * entonces significa que acabo de salir de la zona 
                        * de la alarma y puedo sacar el id de la lista.
                        */
                        var j = ids.indexOf(alarma.id);
                        if (j > -1)
                        {
                            ids.splice(j, 1);
                        }
                    }
                }
            },
            manejarErrorTransaccion);
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

$(document).ready(() =>
{	
	$(document).bind("deviceready", () =>
	{	    
	    db = window.sqlitePlugin.openDatabase(
        {
            name:     "alarmas.db",
            location: "default"
        });
	    
	    db.transaction(
	        (tx) => 
	        {
	            tx.executeSql(sql_crear_tabla); 
            },
	        (error) =>
            {
                console.log(error.message); 
            }, 
	        () => 
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
	    
	    /*$("#btnPrueba").click(() =>
	    {
	        // Limpiar lista de ids en caché:
	        ids = [];
	        console.log("ids vacio: " + JSON.stringify(ids));
	    });*/
	    
	    // Prueba:
	});
});