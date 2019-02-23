// DDL
var sql_crear_tabla  = "Create Table If Not Exists Posicion(id Integer Primary Key,latitud Float Not Null,longitud Float Not Null,descripcion Text Default \"\",distancia Float Default 0,activo Integer Default True);";
var sql_drop_tabla   = "Drop Table Posicion";

// Alarmas
var sql_sel_pos_all  = "Select * From Posicion";
var sql_sel_pos_act  = "Select * From Posicion Where activo = 1";
var sql_ins_pos      = "Insert Into Posicion(latitud,longitud,descripcion,distancia,activo)Values(?,?,?,?,?)";

// Actualizacion de alarmas
var sql_upd_pos_act  = "Update Posicion Set activo = ? Where id = ?";
var sql_upd_pos      = "Update Posicion Set latitud = ?, longitud = ? Where id = ?";
var sql_upd_pos_desc = "Update Posicion Set descripcion = ? Where id = ?";
var sql_upd_pos_dist = "Update Posicion Set distancia = ? Where id = ?";