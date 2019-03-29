const app = new Vue({
    el: "#divVuePos",
    data: {
        watchID: null,
        db: null,
        
        latitud: null,
        longitud: null,
        pos_actual: null,
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
        // * "i" es la posición de la alarma en la tabla.
        centrarEnAlarma: function(alarma) {
            // Mueve el mapa para mostrar la ubicación de la alarma.
            $("#divPanelTabla").panel("close"); // Cierra el panel de la tabla.
            this.pos_actual = [alarma.latitud, alarma.longitud];
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
        borrarAlarma: function(alarma, i) {
            navigator.notification.confirm("¿Desea borrar esta alarma?", (boton) => {
                if (boton == 1) {
                    this.db.transaction(
                        (tx) => {
                            tx.executeSql("Delete From Posicion Where id=?", [alarma.id]);
                        },
                        (error) => { console.log(error.message); },
                        () => {
                            this.alarmas.splice(i, 1);
                            console.log(`Alarma borrada: [${alarma.id}] "${alarma.descripcion}"`);
                        });
                }
            }, "SinTituloGPS", ["Borrar", "Cancelar"]);
        },
        // Observación de la ubicación
        iniciarWatch: function() {
            if (this.watch_iniciado = !this.watch_iniciado) {
                this.accion_watch = "Detener"; // Nombre del botón
                this.error ="";
                // Iniciar navegación por geolocation
                this.watchID = navigator.geolocation.watchPosition(
                    this.onWatchPosition, 
                    (error) => {
                        this.error = error.message;
                        console.log(`Error watch: ${error.message}`);
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
                        this.error = error.message;
                        console.log(error.message);
                        return true;
                    }
                );
            });
            
            // Actualizo la posición actual para pasarla al mapa
            this.pos_actual = [this.latitud, this.longitud];
        },
        // Guardar alarma
        onGuardar: function(posicion) {
            // "posicion" tiene la latitud y longitud de la posición a guardar.
            $("#divPanelGuardar").panel("open");
            $("#inGuardarPos").val(posicion[0] + ", " + posicion[1]);
            $("#inGuardarDesc").val("Posición elegida");
        },
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
            // TODO: Consultar las alarmas de la base de datos SOLO al iniciar la aplicacion.
            this.db.transaction(
                (tx) => {
                    tx.executeSql(
                        sql_sel_pos_all, [], 
                        this.obtenerAlarmas, 
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
        obtenerAlarmas: function(tx, rs) {
            // Vacío la lista de alarmas.
            this.alarmas.splice(0, this.alarmas.length);
            // Obtengo todas las alarmas del resultado de la consulta.
            for (var i = 0; i < rs.rows.length; i++) {
                this.alarmas.push(rs.rows.item(i));
            }
        },
    },
    watch: {
        // Observo los cambios en la lista de alarmas:
        /* alarmas: function() {
            console.log("Cambio en alarmas detectado");
            
            this.borrarMarcadores();
            this.dibujarMarcadores();
        }, */
        /* latitud: function() {
            console.log(`cambió la latitud: ${this.latitud}`);
        },
        longitud: function() {
            console.log(`cambió la longitud: ${this.longitud}`);
        }, */
        
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
    
    // Cordova ================================================================
	$(document).bind("deviceready", function() {
	    console.log("Cordova esta listo.");
	    
	    app.init();
	    
	    $(document).bind("pause", function() { 
	        console.log("Aplicacion pausada"); 
        });
	});
});