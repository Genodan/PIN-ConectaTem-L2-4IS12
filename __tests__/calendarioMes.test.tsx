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
});
