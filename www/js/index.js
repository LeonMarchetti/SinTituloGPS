// Mapbox:
var mapa            = null;
var marcador_actual = null;
var marcadores      = [];

var icono_activo    = null;
var icono_actual    = null;
var icono_inactivo  = null;

const app = new Vue(
{
    el: "#divVuePos",
    data:
    {
        watchID: null,
        db: null,
        
        latitud: null,
        longitud: null,
        error: "",
        ids: [],
        
        watch_iniciado: false,
        accion_watch: "Iniciar",
        
        alarmas: [],
        
        pos_inicial: [-34.578973, -59.086396],
    },
    methods:
    {
        init: () =>
        {
            // SQLite storage
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
                manejarError);
        },
        // Cambiar posición de la alarma
        cambiarPosicion: (alarma, evento) =>
        {
            var pos_nueva = evento.target.value.split(", ");
            if (pos_nueva.length != 2 || isNaN(pos_nueva[0]) || isNaN(pos_nueva[1]))
            {
                navigator.notification.alert("No se escribió bien la posición", null);
            }
            else
            {
                alarma.latitud  = pos_nueva[0];
                alarma.longitud = pos_nueva[1];
                db.transaction(
                (tx) =>
                {
                    tx.executeSql(sql_upd_pos, [alarma.latitud, alarma.longitud, alarma.id]);
                }, 
                manejarError, 
                () => 
                {
                    console.log(`Actualizado: id=${alarma.id}, pos=(${alarma.latitud}, ${alarma.longitud})`);
                });  
            }
        },
        // Cambiar descripción de la alarma
        cambiarDescripcion: (alarma) =>
        {
            db.transaction(
                (tx) =>
                {
                    tx.executeSql(sql_upd_pos_desc, [alarma.descripcion, alarma.id]);
                }, 
                manejarError, 
                () => 
                {
                    console.log(`Actualizado: id=${alarma.id}, descripcion=${alarma.descripcion}`);
                });
        },
        // Cambiar distancia de la alarma
        cambiarDistancia: (alarma) =>
        {
            db.transaction(
                (tx) =>
                {
                    tx.executeSql(sql_upd_pos_dist, [alarma.distancia, alarma.id]);
                }, 
                manejarError, 
                () => 
                {
                    console.log(`Actualizado: id=${alarma.id}, distancia=${alarma.distancia}`);
                });
        },
        // Cambiar estado de la alarma
        cambiarEstado: (alarma) =>
        {
            var activo = (alarma.activo) ? 1 : 0;
            db.transaction(
                (tx) =>
                {
                    tx.executeSql(sql_upd_pos_act, [activo, alarma.id]);
                },
                manejarError, 
                () =>
                {
                    console.log(`Actualizado: id=${alarma.id}, activo=${activo}`);
                });
        },
        borrarAlarma: (alarma) =>
        {
            navigator.notification.confirm("¿Desea borrar esta alarma?", function(i)
            {
                if (i == 1)
                {
                    db.transaction(
                        (tx) => 
                        {
                            tx.executeSql("Delete From Posicion Where id=?", [alarma.id]);
                        },
                        manejarError,
                        function()
                        {
                            for (var i = 0; i < app.alarmas.length; i++)
                            {
                                if (alarma.id == app.alarmas[i].id)
                                {
                                    app.alarmas.splice(i, 1);
                                    break;
                                }
                            }
                            console.log(`Alarma borrada: id=${alarma.id}`);
                            consultarAlarmas();
                        });
                }
            }, "SinTituloGPS", ["Borrar", "Cancelar"]);
        },
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
            console.log(`Insercion: desc="${descripcion}", activo=${activo}`);
            consultarAlarmas();
        });
    
    $("#divPanelGuardar").panel("close");
    
    $("#inGuardarDesc").val("");
    $("#inGuardarDist").val("");
    $("#inGuardarActivo").prop("checked", true);
}

// Alarmas guardadas ===========================================================
function consultarAlarmas()
{
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
    // Borrar marcadores
    while (marcadores.length)
    {
        mapa.removeLayer(marcadores.pop());
    }
    
    app.alarmas = [];
    
    for (var i = 0; i < rs.rows.length; i++)
    {
        var alarma = rs.rows.item(i);
        app.alarmas.push(alarma);
        
        var icono = (alarma.activo)? icono_activo : icono_inactivo;
            
        var marcador = L.marker([alarma.latitud, alarma.longitud])
            .addTo(mapa)
            .setIcon(icono)
            .bindPopup(alarma.descripcion);    
        marcadores.push(marcador);
    }
    
    // $("#tableAlarmas input").textinput();
    // $("#tableAlarmas button").button();
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
    
    console.log(`(${app.latitud}, ${app.longitud})`);
    
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
                        if (!app.ids.includes(alarma.id)) 
                        {
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
    app.error = error.message;
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
                maximumAge:         2000,
            }); 
            
        // Mapbox - Rastrear la ubicación del dispositivo
        mapa.locate(
        {
            watch:              true,
            setView:            true,
            maximumAge:         2000,
            enableHighAccuracy: true,
            maxZoom:            14,
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
        
        // Mapbox - Dejar de rastrear la ubicación del dispositivo
        mapa.stopLocate();
    }
}

$(document).ready(() =>
{	
    console.log("=".repeat(55));
    console.log("El documento esta listo.");
    
    $("#aPanelGuardar").click(() => 
    {
        $("#inGuardarPos").val(app.latitud + ", " + app.longitud);
    });
    
    $("#tableAlarmas").bind("DOMNodeInserted", () => 
    { 
        $("#tableAlarmas").trigger("create");
    });
    
    // Mapbox =================================================================
    L.mapbox.accessToken = 'pk.eyJ1IjoiZGVyaXBwZXIiLCJhIjoiY2p0N25ra29wMHFnZjRhbzhqZGxqMGh3ZyJ9.YJAFA62bEHoa6eL4wy69mA';
    mapa = L.mapbox.map('divMapa')
        .setView(app.pos_inicial, 15)
        .addLayer(L.mapbox.styleLayer('mapbox://styles/mapbox/streets-v11'));
        
    // Inicializar íconos
    icono_actual = L.icon({ iconUrl: "img/star-15.svg" });
    icono_activo = L.icon({ iconUrl: "img/marker-15.svg" });
    icono_inactivo = L.icon({ iconUrl: "img/marker-stroked-15.svg" });
        
    $("#divMapa").on("click", ".spanPopup", () => 
    {
        $("#divPanelGuardar").panel("open");
        var pos_actual = marcador_actual.getLatLng();
        $("#inGuardarPos").val(pos_actual.lat + ", " + pos_actual.lng);
        $("#inGuardarDesc").val("Posición elegida");
    });
        
    marcador_actual = L.marker([0, 0])
        .addTo(mapa)
        .setIcon(icono_actual)
        .bindPopup("<span class='spanPopup'>Guardar</span>");
            
    mapa.on("locationfound", (e) => 
    {
        marcador_actual
            .setLatLng(e.latlng)
            .update();
    });
    
    mapa.on("click", (me) => 
    {
        marcador_actual
            .setLatLng(me.latlng)
            .update();
    });
    
    // Cordova ================================================================
	$(document).bind("deviceready", () =>
	{
	    console.log("Cordova esta listo.");
	    
	    app.init();
	    
	    // Botones:
	    $("#btnWatch").click(iniciarWatch);
	    $("#btnGuardarGuardar").click(guardarAlarma);
	    $("#aPanelTabla").click(consultarAlarmas);
	    
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