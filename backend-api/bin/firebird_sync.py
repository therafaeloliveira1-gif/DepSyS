import sys
import os
import json
import base64
from datetime import date, datetime
from decimal import Decimal

# Helper para decodificar credenciales
def _d(s):
    try:
        return base64.b64decode(s).decode('utf-8')
    except Exception:
        return s

# DLL cliente Firebird si existe en el directorio local
exe_dir = os.path.dirname(os.path.abspath(__file__))
fb_dll = os.path.join(exe_dir, 'fbclient.dll')

if os.path.exists(exe_dir):
    try:
        os.add_dll_directory(exe_dir)
    except Exception:
        pass

try:
    import fdb
    if os.path.exists(fb_dll):
        try:
            fdb.load_api(fb_dll)
        except Exception:
            pass
except ImportError:
    print(json.dumps({"success": False, "error": "Módulo fdb no instalado en Python"}))
    sys.exit(1)

sys.stdout.reconfigure(encoding='utf-8')

class DecimalDateEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)

def get_connection():
    hosts = [
        {"dsn": "192.168.1.10:C:\\System\\SGLoja\\Dados\\FB_DADOS.FDB", "user": "sysdba", "password": "key2624"},
        {"dsn": "192.168.1.10:C:\\System\\SGLoja\\Dados\\FB_DADOS.FDB", "user": "SYSTEMDB", "password": "System30339000"},
        {"dsn": "localhost:C:\\System\\SGLoja\\Dados\\FB_DADOS.FDB", "user": "sysdba", "password": "key2624"}
    ]
    last_err = ""
    for h in hosts:
        try:
            con = fdb.connect(dsn=h["dsn"], user=h["user"], password=h["password"], charset="WIN1252")
            if con:
                return con, None
        except Exception as e:
            last_err = str(e)
            continue
    return None, last_err

def listar_pedidos_pendientes(limit=50):
    con, err = get_connection()
    if not con:
        return {"success": False, "error": f"Error conectando a Firebird: {err}"}
    
    try:
        cur = con.cursor()
        # Pedidos abiertos en espera (CODSITUACAO = 1) ordenados por fecha y hora ascendente (el más antiguo primero)
        query = f"""
            SELECT FIRST {int(limit)} 
                r.NUMRES, r.DATARES, r.HORAATU, r.CODPESSOA, r.NOMEPESSOA, 
                r.CODVEND, r.VLTOTMOV, r.VLTOTDESC, r.OBS, r.CODCOND, r.QTMOV,
                c.DESCRICAO AS COND_DESC, c.QTPARCELA AS COND_PARC
            FROM MOV_RESC r
            LEFT JOIN CAD_CONDPGTOC c ON c.CODCOND = r.CODCOND
            WHERE r.DATARES >= CURRENT_DATE - 15 AND r.CODSITUACAO = 1 AND r.CODOPER = 13
            ORDER BY r.DATARES ASC, r.HORAATU ASC, r.NUMRES ASC
        """
        cur.execute(query)
        rows = cur.fetchall()
        
        pedidos = []
        if not rows:
            # Fallback a pendientes ordenados por los más antiguos primero
            cur.execute(f"""
                SELECT FIRST {int(limit)} 
                    r.NUMRES, r.DATARES, r.HORAATU, r.CODPESSOA, r.NOMEPESSOA, 
                    r.CODVEND, r.VLTOTMOV, r.VLTOTDESC, r.OBS, r.CODCOND, r.QTMOV,
                    c.DESCRICAO AS COND_DESC, c.QTPARCELA AS COND_PARC
                FROM MOV_RESC r
                LEFT JOIN CAD_CONDPGTOC c ON c.CODCOND = r.CODCOND
                WHERE r.CODSITUACAO = 1 AND r.CODOPER = 13
                ORDER BY r.DATARES ASC, r.HORAATU ASC, r.NUMRES ASC
            """)
            rows = cur.fetchall()

        for row in rows:
            num_res, data_res, hora_atu, cod_pessoa, nome_pessoa, cod_vend, vl_tot, vl_desc, obs, cod_cond, qt_mov, cond_desc, cond_parc = row
            piezas = int(qt_mov or 0)
            hora_str = str(hora_atu or "").strip()
            fecha_iso = data_res.isoformat() if data_res else ""
            fecha_completa = f"{fecha_iso} {hora_str}".strip() if (fecha_iso and hora_str) else fecha_iso
            cond_nombre = (cond_desc or "AL CONTADO").strip()
            es_credito = "CREDITO" in cond_nombre.upper() or (cond_parc is not None and int(cond_parc) > 0)
            
            pedidos.append({
                "num_pedido": str(num_res),
                "fecha_pedido": fecha_completa,
                "hora_pedido": hora_str,
                "cliente_codigo": str(cod_pessoa or ""),
                "cliente_nombre": (nome_pessoa or "").strip(),
                "vendedor_id": cod_vend or 0,
                "valor_total": float(vl_tot or 0),
                "total_descuento": float(vl_desc or 0),
                "total_items": piezas,
                "total_piezas": piezas,
                "observaciones": (obs or "").strip(),
                "condicion_pago_id": cod_cond or 1,
                "condicion_pago_nombre": cond_nombre,
                "es_credito": es_credito
            })
            
        con.close()
        return {"success": True, "total": len(pedidos), "pedidos": pedidos}
    except Exception as e:
        if con:
            try: con.close()
            except Exception: pass
        return {"success": False, "error": str(e)}

def obtener_pedido_con_credito(num_pedido):
    con, err = get_connection()
    if not con:
        return {"success": False, "error": f"Error conectando a Firebird: {err}"}
        
    try:
        cur = con.cursor()
        
        # 1. Cabecera del pedido (MOV_RESC)
        cur.execute("""
            SELECT FIRST 1 
                NUMRES, DATARES, HORAATU, CODPESSOA, NOMEPESSOA, CODVEND, 
                VLTOTMOV, VLTOTDESC, OBS, CODCOND, CODSITUACAO
            FROM MOV_RESC
            WHERE NUMRES = ? OR NUMPEDIDO = ?
        """, (str(num_pedido), str(num_pedido)))
        row_c = cur.fetchone()
        
        if not row_c:
            con.close()
            return {"success": False, "error": f"Pedido #{num_pedido} no encontrado en Firebird."}
            
        num_res, data_res, hora_atu, cod_cliente, nome_cliente, cod_vend, vl_tot, vl_desc, obs, cod_cond, cod_sit = row_c
        hora_str = str(hora_atu or "").strip()
        fecha_iso = data_res.isoformat() if data_res else ""
        fecha_completa = f"{fecha_iso} {hora_str}".strip() if (fecha_iso and hora_str) else fecha_iso
        
        # 2. Datos completos del Cliente y Límite de Crédito (CAD_CLIENTE / V_CAD_CLIENTE)
        cliente_data = {
            "codigo": str(cod_cliente or ""),
            "nombre": (nome_cliente or "").strip(),
            "razon_social": (nome_cliente or "").strip(),
            "ruc_cedula": "",
            "ciudad": "",
            "telefono": "",
            "email": "",
            "direccion": "",
            "limite_credito": 0.0,
            "saldo_deudor": 0.0,
            "saldo_disponible": 0.0,
            "facturas_vencidas_cant": 0,
            "facturas_vencidas_monto": 0.0,
            "facturas_pendientes_cant": 0,
            "facturas_pendientes": [],
            "estado_credito": "AL_DIA" # AL_DIA | EN_OBSERVACION | BLOQUEADO
        }
        
        if cod_cliente:
            cur.execute("""
                SELECT FIRST 1 
                    NOME, RAZAOSOCIAL, DOCFISCAL, NUMTELEFONE1, EMAIL1, 
                    ENDERLOGRAD, VLMAXCREDITO
                FROM CAD_CLIENTE 
                WHERE CODCLIENTE = ?
            """, (cod_cliente,))
            row_cli = cur.fetchone()
            
            if row_cli:
                nom, raz, doc, fone, mail, ender, vl_lim = row_cli
                cliente_data["nombre"] = (nom or raz or nome_cliente).strip()
                cliente_data["razon_social"] = (raz or nom or "").strip()
                cliente_data["ruc_cedula"] = (doc or "").strip()
                cliente_data["telefono"] = (fone or "").strip()
                cliente_data["email"] = (mail or "").strip()
                cliente_data["direccion"] = (ender or "").strip()
                cliente_data["limite_credito"] = float(vl_lim or 0)
                
            # Ciudad desde V_CAD_CLIENTE
            try:
                cur.execute("""
                    SELECT FIRST 1 NOMECIDADEPY, NOMEDISTRITOPY, NOMECIDADE 
                    FROM V_CAD_CLIENTE WHERE CODCLIENTE = ?
                """, (cod_cliente,))
                row_cid = cur.fetchone()
                if row_cid:
                    cliente_data["ciudad"] = (row_cid[0] or row_cid[1] or row_cid[2] or "").strip()
            except Exception:
                pass
                
            # 3. Títulos / Facturas por Cobrar del Cliente (V_FCR_CLIREC)
            try:
                hoy = date.today()
                cur.execute("""
                    SELECT NUMFAT, NUMPARC, SITUACAO, DATAEMISSAO, DATAVENCTO, VLFATURA
                    FROM V_FCR_CLIREC
                    WHERE CODCLIENTE = ? AND SITUACAO = 'A'
                    ORDER BY DATAVENCTO ASC
                """, (cod_cliente,))
                titulos = cur.fetchall()
                
                tot_deuda = 0.0
                venc_cant = 0
                venc_monto = 0.0
                lista_tits = []
                
                for num_fat, num_parc, sit, dt_emissao, dt_vencto, vl_fat in titulos:
                    monto = float(vl_fat or 0)
                    tot_deuda += monto
                    es_vencido = bool(dt_vencto and dt_vencto < hoy)
                    
                    if es_vencido:
                        venc_cant += 1
                        venc_monto += monto
                        
                    lista_tits.append({
                        "num_factura": str(num_fat),
                        "cuota": int(num_parc or 1),
                        "fecha_emision": dt_emissao.isoformat() if dt_emissao else "",
                        "fecha_vencimiento": dt_vencto.isoformat() if dt_vencto else "",
                        "monto": monto,
                        "es_vencido": es_vencido,
                        "dias_atraso": (hoy - dt_vencto).days if (es_vencido and dt_vencto) else 0
                    })
                    
                cliente_data["saldo_deudor"] = tot_deuda
                cliente_data["facturas_pendientes_cant"] = len(lista_tits)
                cliente_data["facturas_vencidas_cant"] = venc_cant
                cliente_data["facturas_vencidas_monto"] = venc_monto
                cliente_data["facturas_pendientes"] = lista_tits[:10] # Top 10 facturas
                
                limite = cliente_data["limite_credito"]
                if limite > 0:
                    cliente_data["saldo_disponible"] = max(0.0, limite - tot_deuda)
                else:
                    cliente_data["saldo_disponible"] = 0.0
                    
                # Evaluar semáforo de crédito
                if venc_cant > 0:
                    cliente_data["estado_credito"] = "BLOQUEADO" # Tiene facturas vencidas
                elif limite > 0 and (tot_deuda + float(vl_tot or 0)) > limite:
                    cliente_data["estado_credito"] = "EN_OBSERVACION" # Supera el límite de crédito
                else:
                    cliente_data["estado_credito"] = "AL_DIA"
            except Exception as e:
                sys.stderr.write(f"Error consultando títulos V_FCR_CLIREC: {e}\n")
                
        # 4. Condición de Pago (CAD_CONDPGTOC)
        cond_nombre = "AL CONTADO"
        es_credito = False
        if cod_cond:
            try:
                cur.execute("SELECT FIRST 1 DESCRICAO, QTPARCELA FROM CAD_CONDPGTOC WHERE CODCOND = ?", (cod_cond,))
                row_cnd = cur.fetchone()
                if row_cnd:
                    cond_nombre = (row_cnd[0] or "AL CONTADO").strip()
                    es_credito = "CREDITO" in cond_nombre.upper() or (row_cnd[1] is not None and int(row_cnd[1]) > 0)
            except Exception:
                pass

        # 5. Ítems del Pedido con Descuentos, Lote y Factor Caja (MOV_RESI)
        cur.execute("""
            SELECT 
                NUMITEM, CODPROD, DESCRPROD, QTMOV, VLUNITMOV, 
                VLTOTMOV, PERDESC, VLTOTDESC, VLFATOR, CODLOTE
            FROM MOV_RESI
            WHERE NUMRES = ?
            ORDER BY NUMITEM ASC
        """, (num_res,))
        rows_items = cur.fetchall()
        
        items = []
        tot_piezas = 0
        tot_descuento_items = 0.0
        
        for num_it, cod_p, desc, cant, pr_unit, sub_t, pr_desc, vl_desc_it, vl_fator, cod_lote in rows_items:
            c = float(cant or 1)
            tot_piezas += int(c)
            p_desc = float(pr_desc or 0)
            v_desc = float(vl_desc_it or 0)
            tot_descuento_items += v_desc
            fator_caja = int(vl_fator or 1) if vl_fator else 1
            lote_str = str(cod_lote or "").strip()
            
            # Precio de lista aproximado antes de descuento
            precio_lista = float(pr_unit or 0) + (v_desc / c if c > 0 else 0)
            
            items.append({
                "num_item": int(num_it),
                "sku": str(cod_p or ""),
                "codigo_barra": str(cod_p or ""),
                "descripcion": (desc or "REPUESTO").strip(),
                "cant_caja": fator_caja,
                "cantidad": int(c),
                "cantidad_original": int(c),
                "precio_lista": round(precio_lista),
                "precio_unitario": float(pr_unit or 0),
                "porcentaje_descuento": p_desc,
                "monto_descuento": v_desc,
                "lote": lote_str,
                "subtotal": float(sub_t or 0),
                "ubicacion": "PAS-01"
            })
            
        con.close()
        
        monto_total = float(vl_tot or 0)
        descuento_total = float(vl_desc or 0) if float(vl_desc or 0) > 0 else tot_descuento_items
        
        return {
            "success": True,
            "pedido": {
                "num_pedido": str(num_res),
                "fecha_pedido": fecha_completa,
                "hora_pedido": hora_str,
                "cliente": cliente_data,
                "vendedor_id": cod_vend or 0,
                "total_items": len(items),
                "total_piezas": tot_piezas,
                "subtotal_bruto": monto_total + descuento_total,
                "descuento_total": descuento_total,
                "valor_total": monto_total,
                "observaciones": (obs or "").strip(),
                "condicion_pago_id": cod_cond or 1,
                "condicion_pago_nombre": cond_nombre,
                "es_credito": es_credito,
                "items": items
            }
        }
    except Exception as e:
        if con:
            try: con.close()
            except Exception: pass
        return {"success": False, "error": str(e)}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Comando no especificado"}))
        return
        
    cmd = sys.argv[1].upper().strip()
    
    if cmd == "PENDIENTES":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 50
        res = listar_pedidos_pendientes(limit)
        print(json.dumps(res, cls=DecimalDateEncoder, ensure_ascii=False))
    elif cmd == "PEDIDO":
        if len(sys.argv) < 3:
            print(json.dumps({"success": False, "error": "Debe especificar el número de pedido"}))
            return
        num_pedido = sys.argv[2].strip()
        res = obtener_pedido_con_credito(num_pedido)
        print(json.dumps(res, cls=DecimalDateEncoder, ensure_ascii=False))
    else:
        # Default: tratar como número de pedido
        res = obtener_pedido_con_credito(cmd)
        print(json.dumps(res, cls=DecimalDateEncoder, ensure_ascii=False))

if __name__ == "__main__":
    main()
