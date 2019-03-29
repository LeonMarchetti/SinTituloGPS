POPUP_CONFIG = { autoPan: false };

Vue.component("mapa", {
    template: "#templateMapa",
    props: ["alarmas", "pos_actual", "pos_inicial",],
    data: function() { 
        return {
            mapa:               null,
            icono_activo:       null,
            icono_actual:       null,
            icono_inactivo:     null,
            marcador_actual:    null,
            
            marcadores:         [],
            circulos:           [],
        }
    },
    mounted: function() {
        this.init();
        console.log(`[mounted] Componente "mapa" montado`);
    },
    methods: {
        init: function() {
            L.mapbox.accessToken = MAPBOX_ACCESS_TOKEN;
            this.mapa = L.mapbox.map('divMapa')
                .setView(this.pos_inicial, 15)
                .addLayer(L.mapbox.styleLayer('mapbox://styles/mapbox/streets-v11'));
            
            this.initIconos();
            this.initMarcadores();
                
            this.mapa.on("click", this.onClick);
            $("#divMapa").on("click", ".spanPopup", this.onClickPopup);
        },
        initIconos: function() {
            this.icono_activo   = L.icon({ iconUrl: "img/marker-15.svg" });
            this.icono_actual   = L.icon({ iconUrl: "img/star-15.svg" });
            this.icono_inactivo = L.icon({ iconUrl: "img/marker-stroked-15.svg" });
        },
        initMarcadores: function() {
            // Popup
            var popup_actual = L.popup(POPUP_CONFIG)
                .setContent("<span class='spanPopup'>Guardar</span>");
            
            // Marcador actual
            this.marcador_actual = L.marker([0, 0])
                .addTo(this.mapa)
                .setIcon(this.icono_actual)
                .bindPopup(popup_actual);
        },
        // Eventos
        onClick: function(e) {
            this.marcador_actual.setLatLng(e.latlng);
        },
        onClickPopup: function() {
            var pos_actual = this.marcador_actual.getLatLng();
            this.$emit("guardar", [pos_actual.lat, pos_actual.lng]);
        },
        // Marcadores:
        borrarMarcadores: function() {
            while (this.marcadores.length) {
                this.mapa.removeLayer(this.marcadores.pop());
                this.mapa.removeLayer(this.circulos.pop());
            }
        },
        dibujarMarcadores: function() {
            // Se dibuja un marcador y un círculo para cada alarma en el mapa.
            for(var i = 0; i < this.alarmas.length; i++) {
                var alarma = this.alarmas[i];
                var icono = (alarma.activo)? this.icono_activo : this.icono_inactivo;
                    
                var popup = L.popup(POPUP_CONFIG)
                    .setContent(alarma.descripcion);
                    
                var marcador = L.marker([alarma.latitud, alarma.longitud])
                    .addTo(this.mapa)
                    .setIcon(icono)
                    .bindPopup(popup);
                    
                // TODO: No aparecen los circulos en el mapa (algunas veces si)
                var circulo = L.circle([alarma.latitud, alarma.longitud], alarma.distancia)
                    .addTo(this.mapa);
                    
                this.marcadores.push(marcador);
                this.circulos.push(circulo);
            }
        },
    },
    watch: {
        alarmas: function() {
            this.borrarMarcadores();
            this.dibujarMarcadores();
        },
        pos_actual: function() {
            // Cuando detecto un cambio en "pos_actual" muevo el marcador y el 
            // centro del mapa hacia esa posición
            if (this.pos_actual) {
                this.marcador_actual.setLatLng(this.pos_actual);
                this.mapa.panTo(this.pos_actual);
            }
        },
    },
});