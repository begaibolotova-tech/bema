# free fall from Everest's summit to base-camp altitude, belly-down skydiver, drag with ISA air density
import json, math
m, g = 80.0, 9.81
CdA = 2 * m * g / (1.225 * 55.0 ** 2)          # chosen so terminal speed at sea level = 55 m/s (~200 km/h), belly-down
rho = lambda h: 1.225 * (1 - 2.25577e-5 * h) ** 4.25588   # ISA troposphere
h, v, t, dt, out = 8849.0, 0.0, 0.0, 0.01, []
while h > 5364:
    a = g - 0.5 * rho(h) * CdA * v * v / m
    v += a * dt; h -= v * dt; t += dt
    if abs(t * 10 - round(t * 10)) < 1e-6: out.append([round(t, 1), round(h, 1), round(v, 2)])
vt = lambda h: math.sqrt(2 * m * g / (rho(h) * CdA))
print('time %.1f s, speed at end %.1f m/s = %.0f km/h; terminal at summit %.0f km/h, at 5364 %.0f km/h; rho summit/sea %.2f' % (t, v, v * 3.6, vt(8849) * 3.6, vt(5364) * 3.6, rho(8849) / 1.225))
for target in (.9, .95): print('reach %.0f%% of local terminal at t=' % (target * 100), next(p[0] for p in out if p[2] > target * vt(p[1])))
json.dump({'CdA': CdA, 'series': out}, open('fall.json', 'w'))
