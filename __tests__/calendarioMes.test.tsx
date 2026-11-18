import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CalendarioMes } from '../src/components/CalendarioFechas';

// UT 1585 · el calendario solo ofrece días reales de cada mes.
describe('CalendarioMes', () => {
  it('febrero de 2026 ofrece los días 1 a 28 y no el 29, el 30 ni el 31', async () => {
    await render(<CalendarioMes valor={null} mesInicial={new Date(2026, 1, 1)} onElegir={jest.fn()} />);

    expect(screen.getByText('febrero de 2026')).toBeOnTheScreen();
    expect(screen.getByTestId('dia-2026-02-01')).toBeOnTheScreen();
    expect(screen.getByTestId('dia-2026-02-28')).toBeOnTheScreen();
    expect(screen.queryByTestId('dia-2026-02-29')).toBeNull();
    expect(screen.queryByTestId('dia-2026-02-30')).toBeNull();
    expect(screen.queryByTestId('dia-2026-02-31')).toBeNull();
  });

  it('al pulsar un día lo devuelve a las 00:00 de ese día', async () => {
    const onElegir = jest.fn();
    await render(<CalendarioMes valor={null} mesInicial={new Date(2026, 9, 1)} onElegir={onElegir} />);

    await fireEvent.press(screen.getByTestId('dia-2026-10-15'));

    expect(onElegir).toHaveBeenCalledTimes(1);
    const elegido: Date = onElegir.mock.calls[0][0];
    expect([elegido.getFullYear(), elegido.getMonth(), elegido.getDate(), elegido.getHours()]).toEqual([
      2026, 9, 15, 0,
    ]);
  });

  it('un día desactivado no devuelve nada al pulsarlo', async () => {
    const onElegir = jest.fn();
    await render(
      <CalendarioMes
        valor={null}
        mesInicial={new Date(2026, 9, 1)}
        min={new Date(2026, 9, 10)}
        max={new Date(2026, 9, 20)}
        onElegir={onElegir}
      />,
    );

    await fireEvent.press(screen.getByTestId('dia-2026-10-09'));
    await fireEvent.press(screen.getByTestId('dia-2026-10-21'));
    expect(onElegir).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('dia-2026-10-10'));
    await fireEvent.press(screen.getByTestId('dia-2026-10-20'));
    expect(onElegir).toHaveBeenCalledTimes(2);
  });

  it('navega entre meses, también de diciembre a enero, y respeta los límites', async () => {
    await render(
      <CalendarioMes
        valor={null}
        mesInicial={new Date(2026, 11, 1)}
        min={new Date(2026, 10, 15)}
        max={new Date(2027, 0, 20)}
        onElegir={jest.fn()}
      />,
    );

    expect(screen.getByText('diciembre de 2026')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('mes-siguiente'));
    expect(screen.getByText('enero de 2027')).toBeOnTheScreen();
    expect(screen.getByTestId('mes-siguiente')).toBeDisabled(); // febrero queda después de max

    await fireEvent.press(screen.getByTestId('mes-anterior'));
    await fireEvent.press(screen.getByTestId('mes-anterior'));
    expect(screen.getByText('noviembre de 2026')).toBeOnTheScreen();
    expect(screen.getByTestId('mes-anterior')).toBeDisabled(); // octubre queda antes de min
  });

  // UT 1404 · puntos de color bajo el día
  it('pinta los puntos de cada marca solo en los días que la tienen', async () => {
    await render(
      <CalendarioMes
        valor={null}
        mesInicial={new Date(2026, 10, 1)}
        marcas={{
          '2026-11-03': [
            { id: 'feedback', color: '#2e9e4f' },
            { id: 'enviada', color: '#1f78d1' },
          ],
          '2026-11-05': [{ id: 'enviada', color: '#1f78d1' }],
          '2026-10-26': [{ id: 'feedback', color: '#2e9e4f' }], // otro mes: no se pinta en este
        }}
        onElegir={jest.fn()}
      />,
    );

    expect(screen.getByTestId('marca-2026-11-03-feedback')).toBeOnTheScreen();
    expect(screen.getByTestId('marca-2026-11-03-enviada')).toBeOnTheScreen();
    expect(screen.getByTestId('marca-2026-11-05-enviada')).toBeOnTheScreen();
    expect(screen.queryByTestId('marca-2026-11-05-feedback')).toBeNull();
    expect(screen.queryByTestId('marca-2026-11-04-enviada')).toBeNull();
    expect(screen.queryByTestId('marca-2026-10-26-feedback')).toBeNull();
    expect(screen.getByTestId('marca-2026-11-03-feedback')).toHaveStyle({ backgroundColor: '#2e9e4f' });
  });

  it('un día marcado se puede pulsar igual que uno sin marca', async () => {
    const onElegir = jest.fn();
    await render(
      <CalendarioMes
        valor={null}
        mesInicial={new Date(2026, 10, 1)}
        marcas={{ '2026-11-03': [{ id: 'feedback', color: '#2e9e4f' }] }}
        onElegir={onElegir}
      />,
    );

    await fireEvent.press(screen.getByTestId('dia-2026-11-03'));
    expect(onElegir).toHaveBeenCalledTimes(1);
  });

  it('en el día elegido el punto es blanco con el borde de su color, para que se vea sobre el fondo azul', async () => {
    await render(
      <CalendarioMes
        valor={new Date(2026, 10, 3)}
        mesInicial={new Date(2026, 10, 1)}
        marcas={{
          '2026-11-03': [
            { id: 'feedback', color: '#2e9e4f' },
            { id: 'enviada', color: '#1f78d1' },
          ],
          '2026-11-05': [{ id: 'feedback', color: '#2e9e4f' }],
        }}
        onElegir={jest.fn()}
      />,
    );

    // Día elegido: relleno blanco, borde del color de cada tipo (se sigue distinguiendo el verde del azul)
    expect(screen.getByTestId('marca-2026-11-03-feedback')).toHaveStyle({ backgroundColor: '#fff', borderColor: '#2e9e4f' });
    expect(screen.getByTestId('marca-2026-11-03-enviada')).toHaveStyle({ backgroundColor: '#fff', borderColor: '#1f78d1' });
    // Resto de días: punto lleno del color de su tipo
    expect(screen.getByTestId('marca-2026-11-05-feedback')).toHaveStyle({ backgroundColor: '#2e9e4f' });
  });
});
