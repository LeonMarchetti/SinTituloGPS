Vue.component("mapa", {
    template: "#templateMapa",
    props: ["alarmas", "pos_inicial"],
    data: function() { 
        return {
            mapa:               null,
            icono_activo:       null,
            icono_actual:       null,
            icono_inactivo:     null,
            marcador_actual:    null,
            
            marcadores:         [],
            circulos:           [],
            
            POPUP_CONFIG:       { autoPan: false },
        }
    },
    mounted: function() {
        this.init();
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
            this.mapa.on("locationfound", this.onLocationFound);
            $("#divMapa").on("click", ".spanPopup", this.onClickPopup);
        },
        initIconos: function() {
            this.icono_activo   = L.icon({ iconUrl: "img/marker-15.svg" });
            this.icono_actual   = L.icon({ iconUrl: "img/star-15.svg" });
            this.icono_inactivo = L.icon({ iconUrl: "img/marker-stroked-15.svg" });
        },
        initMarcadores: function() {
            // Popup
            var popup_actual = L.popup(POPUP_CONFIG).setContent("<b>Guardar</b>");
            
            // Marcador actual
            this.marcador_actual = L.marker([0, 0])
                .addTo(this.mapa)
                .setIcon(this.icono_actual)
                .bindPopup(popup_actual);
                
            // Círculos
            var circuloUnlu = L.circle(this.pos_inicial, 200)
                .addTo(this.mapa);
        },
        onClick: function(e) {
            this.marcador_actual.setLatLng(e.latlng);
        },
        onClickPopup: function() {
            var pos_actual = this.marcador_actual.getLatLng();
            console.log(`Guardar: ${pos_actual}`);
        },
        onLocationFound: function(e) {
            this.marcador_actual.setLatLng(e.latlng);
        },
        // Marcadores:
        mostrarMarcadores: function() {
            this.borrarMarcadores();
            
            for (var i = 0; i < this.alarmas.length; i++) {
                var alarma = this.alarmas[i];
                
                // Ícono según si la alarma está activa o inactiva
                var icono = (alarma.activo) ? 
                    this.icono_activo : 
                    this.icono_inactivo;
                 
                // Marcador
                var popup = L.popup(POPUP_CONFIG)
                    .setContent(alarma.descripcion);
                var marcador = L.marker([alarma.latitud, alarma.longitud])
                    .addTo(this.mapa)
                    .setIcon(icono)
                    .bindPopup(popup);
                    
                // Círculo alrededor del marcador (No funciona)
                var circulo = L.circle([alarma.latitud, alarma.longitud], alarma.distancia)
                    .addTo(this.mapa);
                    
                /* Guardar las referencias al marcador y al círculo para poder 
                 * borrarlos después.
                 */
                this.marcadores.push(marcador);
                this.circulos.push(circulo);
            }
        },
        borrarMarcadores: function() {
            while (this.marcadores.length) {
                this.mapa.removeLayer(this.marcadores.pop());
                this.mapa.removeLayer(this.circulos.pop());
            }
        },
        watch: {
            alarmas: function() {
                this.mostrarMarcadores();
            },
        },
    },
});