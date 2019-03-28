// Mapbox:
var mapa            = null;
var marcador_actual = null;
var marcadores      = [];
var circulos        = [];

var icono_activo    = null;
var icono_actual    = null;
var icono_inactivo  = null;

const app = new Vue({
    el: "#divVuePos",
    data: {
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
    methods: {
        init: function() {
            // SQLite storage
            this.db = window.sqlitePlugin.openDatabase({
                name:     "alarmas.db",
                location: "default"
            });
            
            this.db.transaction(
                function(tx) {
                    tx.executeSql(sql_crear_tabla);
                },
                function(error) { console.log(error.message); }
            );
        },
        // Tabla de alarmas
        centrarEnAlarma: function(alarma) {
            mapa.panTo([alarma.latitud, alarma.longitud]);
        },
        cambiarPosicion: function(alarma, i, evento) {
            var pos_nueva = evento.target.value.split(", ");
            if (pos_nueva.length != 2 || isNaN(pos_nueva[0]) || isNaN(pos_nueva[1])) {
                navigator.notification.alert("No se escribió bien la posición", null);
            }
            else {
                alarma.latitud  = pos_nueva[0];
                alarma.longitud = pos_nueva[1];
                this.db.transaction(
                    (tx) => {
                        tx.executeSql(sql_upd_pos, [alarma.latitud, alarma.longitud, alarma.id]);
                    }, 
                    (error) => { console.log(error.message); }, 
                    () => {
                        
                        console.log(`Actualizado: id=${alarma.id}, pos=(${alarma.latitud}, ${alarma.longitud})`);
                        Vue.set(this.alarmas, i, alarma);
                    });  
            }
        },
        cambiarDescripcion: function(alarma, i) {
            this.db.transaction(
                (tx) => {
                    tx.executeSql(sql_upd_pos_desc, [alarma.descripcion, alarma.id]);
                }, 
                (error) => { console.log(error.message); }, 
                () => {
                    console.log(`Actualizado: id=${alarma.id}, descripcion=${alarma.descripcion}`);
                    Vue.set(this.alarmas, i, alarma);
                });
        },
        cambiarDistancia: function(alarma, i) {
            this.db.transaction(
                (tx) => {
                    tx.executeSql(sql_upd_pos_dist, [alarma.distancia, alarma.id]);
                }, 
                (error) => { console.log(error.message); }, 
                () => {
                    console.log(`Actualizado: id=${alarma.id}, distancia=${alarma.distancia}`);
                    Vue.set(this.alarmas, i, alarma);
                });
        },
        cambiarEstado: function(alarma, i) {
            var activo = (alarma.activo) ? 1 : 0;
            this.db.transaction(
                (tx) => {
                    tx.executeSql(sql_upd_pos_act, [activo, alarma.id]);
                },
                (error) => { console.log(error.message); }, 
                () => {
                    console.log(`Actualizado: id=${alarma.id}, activo=${activo}`);
                    Vue.set(this.alarmas, i, alarma);
                });
        },
        borrarAlarma: function(alarma, indice) {
            navigator.notification.confirm("¿Desea borrar esta alarma?", (i) => {
                if (i == 1) {
                    this.db.transaction(
                        (tx) => {
                            tx.executeSql("Delete From Posicion Where id=?", [alarma.id]);
                        },
                        (error) => { console.log(error.message); },
                        () => {
                            this.alarmas.splice(indice, 1);
                            console.log(`Alarma borrada: [${alarma.id}] "${alarma.descripcion}"`);
                        });
                }
            }, "SinTituloGPS", ["Borrar", "Cancelar"]);
        },
        // Observación de la ubicación
        iniciarWatch: function() {
            if (this.watch_iniciado = !this.watch_iniciado) {
                this.accion_watch = "Detener"; // Nombre del botón
                // Iniciar navegación por geolocation
                this.watchID = navigator.geolocation.watchPosition(
                    this.onWatchPosition, 
                    (error) => {
                        this.error = error.message;
                    }, 
                    {
                        timeout:            30000,
                        enableHighAccuracy: true,
                        maximumAge:         2000,
                    }
                );
                
                console.log(`watchPosition iniciado para id=${this.watchID}`);
            }
            else {
                // Detener navegación
                this.accion_watch = "Iniciar"; // Nombre del botón
                navigator.geolocation.clearWatch(this.watchID);
                console.log(`watchPosition terminado para id=${this.watchID}`);
                this.watchID = null;
                this.ids = [];
            }
        },
        onWatchPosition: function(pos) {
            this.latitud  = pos.coords.latitude;
            this.longitud = pos.coords.longitude;
            this.error    = "";
            
            console.log(`Ubicación: (${this.latitud}, ${this.longitud})`);
            
            this.db.transaction((tx) => {
                tx.executeSql(
                    sql_sel_pos_act, [],
                    (tx, rs) => {
                        // Itero por todas las alarmas para ver si estoy cerca 
                        // de alguna y lanzar una notificación cuando así sea.
                        for (var i = 0; i < rs.rows.length; i++) {
                            var alarma = rs.rows.item(i);
                            
                            // Calcular distancia de la alarma a nuestra 
                            // posición actual, usando latitud/longitud de 
                            // ambas.
                            var d = distancia(
                                this.latitud, this.longitud, 
                                alarma.latitud, alarma.longitud);
                    
                            if (d <= (alarma.distancia / 1000)) {
                                // Si el id de la alarma no está en la lista, 
                                // significa que recién acabo de llegar al área
                                // de la alarma y entonces tengo que lanzar la 
                                // notificación.
                                if (!this.ids.includes(alarma.id))  {
                                    notificar("Alarma GPS", alarma.descripcion);
                                    this.ids.push(alarma.id);
                                }
                            }
                            else {
                                // Si el id está actualmente en la lista de ids,
                                // entonces significa que acabo de salir de la 
                                // zona de la alarma y puedo sacar el id de la
                                // lista.
                                var j = this.ids.indexOf(alarma.id);
                                if (j > -1) {
                                    this.ids.splice(j, 1);
                                }
                            }
                        }
                    },
                    (tx, error) => {
                        console.log(error.message);
                        return true;
                    }
                );
            });
            
            // Mapbox
            // Mover marcador a nuestra ubicación actual:
            marcador_actual.setLatLng([this.latitud, this.longitud]).update();
                
            // Poner nuestra ubicación actual como centro del mapa:
            mapa.panTo([this.latitud, this.longitud]);
        },
        // Guardar alarma
        guardarAlarma: function() {
            // Tomo los datos de la nueva alarma de los controles
            var posicion = $("#inGuardarPos").val().split(", ");
            var alarma = {
                latitud:        posicion[0],
                longitud:       posicion[1],
                descripcion:    $("#inGuardarDesc").val(),
                distancia:      $("#inGuardarDist").val(),
                activo:         ($("#inGuardarActivo").prop("checked")) ? 1 : 0,
            };
            
            // Inserto la nueva alarma en la base de datos
            this.db.transaction(
                (tx) => {
                    tx.executeSql(sql_ins_pos, [alarma.latitud, alarma.longitud, alarma.descripcion, alarma.distancia, alarma.activo]);
                }, 
                function(error) { console.log(error.message); },
                () => {
                    // Obtengo el id de la alarma recién insertada:
                    this.db.transaction(
                        (tx) => {
                            tx.executeSql(
                                "Select last_insert_rowid() As id", [],
                                (tx, rs) => {
                                    alarma.id = rs.rows.item(0).id;
                                    console.log(`Insercion: id=${alarma.id} desc="${alarma.descripcion}", activo=${alarma.activo}`);
                                    this.alarmas.push(alarma);
                                }
                            );
                        });
                });

            // Cierro el panel después de guardar:
            $("#divPanelGuardar").panel("close");
        },
        // Mostrar alarmas
        consultarAlarmas: function() {
            this.db.transaction(
                (tx) => {
                    tx.executeSql(
                        sql_sel_pos_all, [], 
                        this.llenarTablaAlarmas, 
                        (tx, error) => {
                            console.log(error.message);
                            return true;
                        }
                    );
                },
                (tx, error) => {
                    console.log(error.message);
                    return true;
                }
            );
        },
        llenarTablaAlarmas: function(tx, rs) {
            // Vacío la lista de alarmas:
            this.alarmas.splice(0, this.alarmas.length);
            
            for (var i = 0; i < rs.rows.length; i++) {
                this.alarmas.push(rs.rows.item(i));
            }
        },
        // Mapbox
        borrarMarcadores: function() {
            while (marcadores.length) {
                mapa.removeLayer(marcadores.pop());
                mapa.removeLayer(circulos.pop());
            }
        },
        dibujarMarcadores: function() {
            for(var i = 0; i < this.alarmas.length; i++) {
                var alarma = this.alarmas[i];
                var icono = (alarma.activo)? icono_activo : icono_inactivo;
                    
                var marcador = L.marker([alarma.latitud, alarma.longitud])
                    .addTo(mapa)
                    .setIcon(icono)
                    .bindPopup(alarma.descripcion);
                    
                // TODO: El circulo de una alarma recien guardada es muy chiquito.
                var circulo = L.circle([alarma.latitud, alarma.longitud], alarma.distancia)
                    .addTo(mapa);
                    
                marcadores.push(marcador);
                circulos.push(circulo);
            }
        },
    },
    watch: {
        // Observo los cambios en la lista de alarmas:
        alarmas: function() {
            console.log("Cambio en alarmas detectado");
            
            this.borrarMarcadores();
            this.dibujarMarcadores();
        },
    },
});

// Notificaciones ==============================================================
function notificar(titulo, texto) {
    cordova.plugins.notification.local.schedule({
        title:      titulo,
        text:       texto,
        foreground: true
    });
}

// Distancia ===================================================================
function toRad(g) {
    return g * Math.PI / 180;
}

function distancia(lat1, lon1, lat2, lon2) {
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

$(document).ready(function() {	
    console.log("=".repeat(55));
    console.log("El documento esta listo.");
    
    $("#aPanelGuardar").click(function() {
        // Colocar la posición actual en el panel de guardar alarma
        $("#inGuardarPos").val(app.latitud + ", " + app.longitud);
    });
    
    $("#tableAlarmas").bind("DOMNodeInserted", function() {
        // Activar los estilos de JQM en los elementos de las filas de la tabla 
        // cuando se agregan nuevas filas.
        $("#tableAlarmas").trigger("create");
    });
    
    // Mapbox =================================================================
    L.mapbox.accessToken = MAPBOX_ACCESS_TOKEN;
    mapa = L.mapbox.map('divMapa')
        .setView(app.pos_inicial, 15)
        .addLayer(L.mapbox.styleLayer('mapbox://styles/mapbox/streets-v11'));
        
    // Inicializar íconos
    icono_actual = L.icon({ iconUrl: "img/star-15.svg" });
    icono_activo = L.icon({ iconUrl: "img/marker-15.svg" });
    icono_inactivo = L.icon({ iconUrl: "img/marker-stroked-15.svg" });
        
    $("#divMapa").on("click", ".spanPopup", function() {
        $("#divPanelGuardar").panel("open");
        var pos_actual = marcador_actual.getLatLng();
        $("#inGuardarPos").val(pos_actual.lat + ", " + pos_actual.lng);
        $("#inGuardarDesc").val("Posición elegida");
    });
        
    marcador_actual = L.marker([0, 0])
        .addTo(mapa)
        .setIcon(icono_actual)
        .bindPopup("<span class='spanPopup'>Guardar</span>");
            
    mapa.on("click", function(me) {
        marcador_actual
            .setLatLng(me.latlng)
            .update();
    });
    
    // Cordova ================================================================
	$(document).bind("deviceready", function() {
	    console.log("Cordova esta listo.");
	    
	    app.init();
	    
	    $(document).bind("pause", function() { 
	        console.log("Aplicacion pausada"); 
        });
	});
});