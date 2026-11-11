import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  INICIALES_DIAS,
  NOMBRES_MESES,
  aTextoISO,
  diaDeshabilitado,
  formatearFecha,
  inicioDelDia,
  mismoDia,
  semanasDelMes,
  textoLargoDeFecha,
} from '../services/calendarioService';

// UT 1585 · Elegir las fechas del periodo con un calendario.
// Solo ofrece días reales, y desactiva los que quedan fuera de [min, max].

interface CampoFechaProps {
  etiqueta: string;
  testID: string;
  valor: Date | null;
  abierto: boolean;
  onPress: () => void;
}

/** Botón con aspecto de campo: muestra la fecha elegida como dd/mm/aaaa. */
export function CampoFecha({ etiqueta, testID, valor, abierto, onPress }: CampoFechaProps) {
  return (
    <View style={styles.columnaFecha}>
      <Text style={styles.labelFecha}>{etiqueta}</Text>
      <TouchableOpacity
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta} ${valor ? textoLargoDeFecha(valor) : 'sin elegir'}`}
        accessibilityState={{ expanded: abierto }}
        style={[styles.campo, abierto && styles.campoAbierto]}
        onPress={onPress}
      >
        <Text style={valor ? styles.textoCampo : styles.textoCampoVacio}>
          {valor ? formatearFecha(valor) : 'dd/mm/aaaa'}
        </Text>
        <Text style={styles.iconoCampo}>📅</Text>
      </TouchableOpacity>
    </View>
  );
}

interface CalendarioMesProps {
  /** Día elegido (se pinta con relleno azul). */
  valor: Date | null;
  /** Otro día de referencia, por ejemplo el «Desde» cuando se elige el «Hasta» (azul claro). */
  marcado?: Date | null;
  /** Días anteriores a este no se pueden elegir. */
  min?: Date | null;
  /** Días posteriores a este no se pueden elegir. */
  max?: Date | null;
  /** Mes que se enseña al abrir. Por defecto: el del día elegido, o el de `max`, o el de hoy. */
  mesInicial?: Date;
  onElegir: (fecha: Date) => void;
  testID?: string;
}

export function CalendarioMes({
  valor,
  marcado = null,
  min = null,
  max = null,
  mesInicial,
  onElegir,
  testID = 'calendario',
}: CalendarioMesProps) {
  const base = mesInicial ?? valor ?? max ?? new Date();
  const [vista, setVista] = useState({ anio: base.getFullYear(), mes: base.getMonth() });

  const hoy = inicioDelDia(new Date());
  const ultimoDiaMesAnterior = new Date(vista.anio, vista.mes, 0);
  const primerDiaMesSiguiente = new Date(vista.anio, vista.mes + 1, 1);
  const anteriorDeshabilitado = !!min && ultimoDiaMesAnterior.getTime() < inicioDelDia(min).getTime();
  const siguienteDeshabilitado = !!max && primerDiaMesSiguiente.getTime() > inicioDelDia(max).getTime();

  const irAMes = (cambio: number) =>
    setVista((v) => {
      const f = new Date(v.anio, v.mes + cambio, 1);
      return { anio: f.getFullYear(), mes: f.getMonth() };
    });

  return (
    <View style={styles.calendario} testID={testID}>
      <View style={styles.cabeceraMes}>
        <TouchableOpacity
          testID="mes-anterior"
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          disabled={anteriorDeshabilitado}
          onPress={() => irAMes(-1)}
          style={styles.flechaMes}
        >
          <Text style={[styles.textoFlecha, anteriorDeshabilitado && styles.textoDeshabilitado]}>‹</Text>
        </TouchableOpacity>
        <Text testID="calendario-mes" style={styles.tituloMes}>
          {`${NOMBRES_MESES[vista.mes]} de ${vista.anio}`}
        </Text>
        <TouchableOpacity
          testID="mes-siguiente"
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          disabled={siguienteDeshabilitado}
          onPress={() => irAMes(1)}
          style={styles.flechaMes}
        >
          <Text style={[styles.textoFlecha, siguienteDeshabilitado && styles.textoDeshabilitado]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.fila}>
        {INICIALES_DIAS.map((inicial) => (
          <Text key={inicial} style={styles.inicialDia}>
            {inicial}
          </Text>
        ))}
      </View>

      {semanasDelMes(vista.anio, vista.mes).map((semana, i) => (
        <View key={i} style={styles.fila}>
          {semana.map((dia, j) => {
            if (dia === null) return <View key={j} style={styles.celda} />;

            const fecha = new Date(vista.anio, vista.mes, dia);
            const deshabilitado = diaDeshabilitado(fecha, min, max);
            const elegido = mismoDia(fecha, valor);
            const referencia = !elegido && mismoDia(fecha, marcado);
            return (
              <TouchableOpacity
                key={j}
                testID={`dia-${aTextoISO(fecha)}`}
                accessibilityRole="button"
                accessibilityLabel={textoLargoDeFecha(fecha)}
                accessibilityState={{ disabled: deshabilitado, selected: elegido }}
                disabled={deshabilitado}
                onPress={() => onElegir(fecha)}
                style={[
                  styles.celda,
                  referencia && styles.celdaReferencia,
                  mismoDia(fecha, hoy) && styles.celdaHoy,
                  elegido && styles.celdaElegida,
                ]}
              >
                <Text
                  style={[
                    styles.textoDia,
                    referencia && styles.textoReferencia,
                    elegido && styles.textoElegido,
                    deshabilitado && styles.textoDeshabilitado,
                  ]}
                >
                  {dia}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  columnaFecha: {
    flex: 1,
  },
  labelFecha: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  campo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  campoAbierto: {
    borderColor: '#1F5C8C',
    borderWidth: 2,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  textoCampo: {
    fontSize: 14,
    color: '#333',
  },
  textoCampoVacio: {
    fontSize: 14,
    color: '#aaa',
  },
  iconoCampo: {
    fontSize: 14,
  },
  calendario: {
    // En una ventana ancha (web) las celdas se estiraban demasiado: se limita el ancho y se centra
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9e2ec',
    borderRadius: 8,
  },
  cabeceraMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  flechaMes: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  textoFlecha: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F5C8C',
  },
  tituloMes: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  fila: {
    flexDirection: 'row',
  },
  inicialDia: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#80808a',
    paddingVertical: 4,
  },
  celda: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 1,
  },
  celdaReferencia: {
    backgroundColor: '#d6e5ff',
  },
  celdaHoy: {
    borderWidth: 1,
    borderColor: '#1F5C8C',
  },
  celdaElegida: {
    backgroundColor: '#1F5C8C',
  },
  textoDia: {
    fontSize: 14,
    color: '#212626',
  },
  textoReferencia: {
    color: '#0d4099',
    fontWeight: 'bold',
  },
  textoElegido: {
    color: '#fff',
    fontWeight: 'bold',
  },
  textoDeshabilitado: {
    color: '#bebec6',
  },
});
