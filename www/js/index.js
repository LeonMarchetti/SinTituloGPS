const app = new Vue(
{
    el: "#divVuePos",
    data:
    {
        latitud: null,
        longitud: null,
        error: "",
        ids: [],
        watchID: null,
        db: null,
        watch_iniciado: false,
        mostrar_alarmas: false,
        
        accion_watch: "Iniciar",
        accion_alarmas: "Mostrar",
        
        alarmas: []
    },
    methods:
    {
        init: () =>
        {
            // Iniciar base de datos:
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
                });
        }
    }
});

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
    
    // Valores iniciales para input de guardar:
    $("#inGuardarPos").val(`${app.latitud}, ${app.longitud}`);
    
    $("html, body").animate(
    {
        scrollTop: ($("#divGuardar").offset().top)
    }, 500);
}

function guardarAlarma()
{
    var posicion    = $("#inGuardarPos").val().split(", ");
    var latitud     = posicion[0];
    var longitud    = posicion[1];
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
    if (app.mostrar_alarmas = !app.mostrar_alarmas)
    {
        consultarAlarmas();
        app.accion_alarmas = "Ocultar";
    }
    else
    {
        app.accion_alarmas = "Mostrar";
    }
}

function consultarAlarmas()
{
    $("#tbodyAlarmas").empty();
    
    db.transaction(
        (tx) => 
        {
            tx.executeSql(
                sql_sel_pos_all, [], 
                llenarTablaAlarmas, 
                manejarErrorTransaccion);
        },
        manejarErrorTransaccion);
}

function llenarTablaAlarmas(tx, rs)
{
    app.alarmas = [];
    for (var i = 0; i < rs.rows.length; i++)
    {
        app.alarmas.push(rs.rows.item(i));
    }
    
    $("#tbodyAlarmas .alarmaId").click(borrarAlarma);
    $("#tbodyAlarmas .alternarAlarma").change(cambiarEstado);
    $("#tbodyAlarmas .alarmaPos").change(cambiarPosicion);
    $("#tbodyAlarmas .alarmaDesc").change(cambiarDescripcion);
    $("#tbodyAlarmas .alarmaDist").change(cambiarDistancia);
}

function borrarAlarma(e)
{
    var id = $(e.target).text();
    
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
                    $(e.target).parent().remove();
                });
        }
    }, "SinTituloGPS", ["Borrar", "Cancelar"]);
}

// Actualizar alarmas ==========================================================
function cambiarEstado(e)
{
    var activo = ($(e.target).prop("checked")) ? 1 : 0;
    var id     = $(e.target).parent().parent().children(".alarmaId").text();
    
    db.transaction(
        (tx) =>
        {
            tx.executeSql(sql_upd_pos_act, [activo, id]);
        },
        manejarError, 
        () =>
        {
            console.log(`Actualizado: id=${id}, activo=${activo}`);
        });
}

function cambiarPosicion(e)
{
    var pos_nueva = $(e.target).val().split(", ");
    var id        = $(e.target).parent().parent().children(".alarmaId").text();
    
    db.transaction(
        (tx) =>
        {
            tx.executeSql(sql_upd_pos, [pos_nueva[0], pos_nueva[1], id]);
        }, 
        manejarError, 
        () => 
        {
            console.log(`Actualizado: id=${id}, pos=(${pos_nueva[0]}, ${pos_nueva[1]})`);
        });
}

function cambiarDescripcion(e)
{
    var desc_nueva = $(e.target).val();
    var id         = $(e.target).parent().parent().children(".alarmaId").text();
    
    db.transaction(
        (tx) =>
        {
            tx.executeSql(sql_upd_pos_desc, [desc_nueva, id]);
        }, 
        manejarError, 
        () => 
        {
            console.log(`Actualizado: id=${id}, descripcion=${desc_nueva}`);
        });
}

function cambiarDistancia(e)
{
    var dist_nueva = $(e.target).val();
    var id         = $(e.target).parent().parent().children(".alarmaId").text();
    
    db.transaction(
        (tx) =>
        {
            tx.executeSql(sql_upd_pos_dist, [dist_nueva, id]);
        }, 
        manejarError, 
        () => 
        {
            console.log(`Actualizado: id=${id}, distancia=${dist_nueva}`);
        });
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
    app.latitud  = pos.coords.latitude;
    app.longitud = pos.coords.longitude;
    app.error    = "";
    
//    console.log(`(${app.latitud}, ${app.longitud})`);
    
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
                                     app.latitud, app.longitud,
                                     alarma.latitud, alarma.longitud);
            
                    if (d <= (alarma.distancia / 1000))
                    {
                       /* 
                        * Si el id de la alarma no está en la lista, 
                        * significa que recién acabo de llegar al área de 
                        * la alarma y entonces tengo que lanzar la 
                        * notificación.
                        */
//                        console.log(`Alarma cerca: ${alarma.id}`);
                        if (!app.ids.includes(alarma.id)) 
                        {
                            console.log("Alarma encontrada: id=" + alarma.id);
                            notificar("Alarma GPS", alarma.descripcion);
                            app.ids.push(alarma.id);
                        }
                    }
                    else
                    {
                       /* 
                        * Si el id está actualmente en la lista de ids,
                        * entonces significa que acabo de salir de la zona 
                        * de la alarma y puedo sacar el id de la lista.
                        */
                        var j = app.ids.indexOf(alarma.id);
                        if (j > -1)
                        {
                            app.ids.splice(j, 1);
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
    app.error = `${codigo} - ${error.message}`;
}

function iniciarWatch()
{
    if (app.watch_iniciado = !app.watch_iniciado)
    {
        app.accion_watch = "Detener";
        app.watchID = navigator.geolocation.watchPosition(
            onWatchPosition, 
            onWatchPositionError, 
            {
                timeout:            30000,
                enableHighAccuracy: true,
                maximumAge:         1000
            }); 
        console.log(`watchPosition iniciado para id=${app.watchID}`);
    }
    else
    {
        app.accion_watch = "Iniciar";
        navigator.geolocation.clearWatch(app.watchID);
        console.log(`watchPosition terminado para id=${app.watchID}`);
        app.watchID = null;
        app.ids = [];
    }
}

$(document).ready(() =>
{	
    console.log("=".repeat(72));
    console.log("El documento esta listo.");
    
	$(document).bind("deviceready", () =>
	{
	    console.log("Cordova esta listo.");
	    
	    app.init();
	    
	    // Botones:
	    $("#btnWatch").click(iniciarWatch);
	    $("#btnGuardar").click(habilitarGuardar);
	    $("#btnMostrar").click(mostrarAlarmas);
	    
	    $("#btnGuardarCancelar").click(cancelarGuardarAlarma);
	    $("#btnGuardarGuardar").click(guardarAlarma);
	    
	    $(document).bind("pause", () => 
	    { 
	        console.log("Aplicacion pausada"); 
        });
	    
	    /* Prueba: *
	    $("#btnPrueba").click(() =>
	    {
	        // Limpiar lista de ids en caché:
	        app.ids = [];
	        console.log(`ids vacio: ${JSON.stringify(app.ids)}`);
	    });
	    //*/
	});
});