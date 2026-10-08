'use client';

/* eslint-disable jsx-a11y/prefer-tag-over-role -- The local canvas is a generated QR image with an accessible name; converting it to img would add a second bitmap. */

import { useEffect, useRef, useState } from 'react';
import type { QRCode } from 'qrcode';
import { Clipboard, Download, ImageUp, QrCode, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { downloadBlob } from '@/lib/browser-files';
import {
  buildQrPayload,
  createQr,
  getQrLink,
  QR_MAX_BYTES,
  qrToCanvas,
  qrToSvg,
  readQrImagePixels,
  validateQrImageFile,
  type QrInput,
} from '@/lib/qr';

const emptyFields = {
  text: '',
  url: '',
  ssid: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  organization: '',
};
type Fields = typeof emptyFields;
type QrResult = { qr: QRCode; content: string };

export function QrWorkshop() {
  const [mode, setMode] = useState<'create' | 'read'>('create');
  const [kind, setKind] = useState<QrInput['kind']>('text');
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [security, setSecurity] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [hidden, setHidden] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<QrResult | null>(null);
  const preview = useRef<HTMLCanvasElement | null>(null);
  const [decoded, setDecoded] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const sequence = useRef(0);
  const operation = useRef<AbortController | null>(null);
  const reader = useRef<Worker | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const form = useRef<HTMLFormElement | null>(null);

  useEffect(
    () => () => {
      sequence.current++;
      operation.current?.abort();
      reader.current?.terminate();
    },
    [],
  );

  useEffect(() => {
    if (!result || !preview.current) return;
    const canvas = qrToCanvas(result.qr);
    const target = preview.current;
    target.width = canvas.width;
    target.height = canvas.height;
    target.getContext('2d')?.drawImage(canvas, 0, 0);
    canvas.width = canvas.height = 0;
    return () => {
      target.width = target.height = 0;
    };
  }, [result]);

  useEffect(() => {
    const forget = () => {
      sequence.current++;
      operation.current?.abort();
      reader.current?.terminate();
      reader.current = null;
      operation.current = null;
      setFields({ ...emptyFields });
      setResult(null);
      setDecoded('');
      setShowPassword(false);
      setHidden(false);
      setBusy(false);
      setError('');
      setNotice('');
      if (fileInput.current) fileInput.current.value = '';
      // Browsers can restore native form values separately from React state
      // during history navigation. Remove those DOM copies as well.
      for (const control of Array.from(form.current?.elements ?? [])) {
        if (control instanceof HTMLTextAreaElement) control.value = '';
        if (control instanceof HTMLInputElement) {
          if (control.type === 'checkbox') control.checked = false;
          else control.value = '';
        }
      }
      if (preview.current) preview.current.width = preview.current.height = 0;
    };
    window.addEventListener('pagehide', forget);
    window.addEventListener('pageshow', forget);
    return () => {
      window.removeEventListener('pagehide', forget);
      window.removeEventListener('pageshow', forget);
    };
  }, []);

  function cancel() {
    sequence.current++;
    operation.current?.abort();
    operation.current = null;
    reader.current?.terminate();
    reader.current = null;
    setBusy(false);
  }

  function invalidate() {
    cancel();
    setResult(null);
    setDecoded('');
    setError('');
    setNotice('');
  }

  function clear() {
    invalidate();
    setFields({ ...emptyFields });
    setHidden(false);
    setShowPassword(false);
    if (fileInput.current) fileInput.current.value = '';
    setNotice(
      'Sesión limpia. El portapapeles y los archivos descargados dependen de tu sistema.',
    );
  }

  function update(field: keyof Fields, value: string) {
    invalidate();
    setFields((current) => ({ ...current, [field]: value }));
  }

  function payload(): QrInput {
    if (kind === 'text') return { kind, text: fields.text };
    if (kind === 'url') return { kind, url: fields.url };
    if (kind === 'wifi')
      return {
        kind,
        ssid: fields.ssid,
        password: fields.password,
        security,
        hidden,
      };
    return {
      kind,
      firstName: fields.firstName,
      lastName: fields.lastName,
      phone: fields.phone,
      email: fields.email,
      organization: fields.organization,
    };
  }

  async function generate() {
    invalidate();
    const current = sequence.current;
    setBusy(true);
    try {
      const content = buildQrPayload(payload());
      const qr = await createQr(content);
      if (current !== sequence.current) return;
      setResult({ content, qr });
      setNotice(
        'QR listo. Revisa el contenido y descarga el formato que necesitas.',
      );
    } catch (failure) {
      if (current === sequence.current)
        setError(
          failure instanceof Error
            ? failure.message
            : 'No se pudo crear el QR. Revisa el contenido y vuelve a intentarlo.',
        );
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  }

  async function readImage(file: File) {
    invalidate();
    const current = sequence.current;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    try {
      validateQrImageFile(file);
      const pixels = await readQrImagePixels(file, controller.signal);
      controller.signal.throwIfAborted();
      if (typeof Worker === 'undefined')
        throw new Error(
          'Tu navegador no permite el lector local en segundo plano. Prueba un navegador reciente.',
        );
      const worker = new Worker(
        new URL('../lib/qr-reader.worker.ts', import.meta.url),
        { type: 'module' },
      );
      reader.current = worker;
      const text = await new Promise<string>((resolve, reject) => {
        const timeout = window.setTimeout(
          () =>
            finish(
              new Error(
                'La lectura tardó demasiado. Recorta la imagen alrededor del QR y vuelve a intentarlo.',
              ),
            ),
          15000,
        );
        const onAbort = () =>
          finish(new DOMException('Lectura cancelada', 'AbortError'));
        function finish(failure?: Error, value?: string) {
          window.clearTimeout(timeout);
          controller.signal.removeEventListener('abort', onAbort);
          worker.terminate();
          if (reader.current === worker) reader.current = null;
          if (failure) reject(failure);
          else resolve(value ?? '');
        }
        controller.signal.addEventListener('abort', onAbort, { once: true });
        worker.onmessage = (
          event: MessageEvent<{ text?: string; error?: string }>,
        ) => {
          if (event.data.error) finish(new Error(event.data.error));
          else finish(undefined, event.data.text);
        };
        worker.onerror = () =>
          finish(
            new Error(
              'No se pudo cargar el lector local. Recarga la página y vuelve a elegir la imagen.',
            ),
          );
        worker.postMessage(
          { data: pixels.data, width: pixels.width, height: pixels.height },
          [pixels.data.buffer],
        );
      });
      if (current !== sequence.current) return;
      setDecoded(text);
      setNotice(
        'QR leído. Revisa el contenido antes de copiarlo o abrir un enlace.',
      );
    } catch (failure) {
      if (current === sequence.current && !controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : 'La imagen no pudo leerse. Prueba otra imagen válida.',
        );
    } finally {
      if (current === sequence.current) {
        setBusy(false);
        operation.current = null;
      }
    }
  }

  async function copy(value: string) {
    const current = sequence.current;
    try {
      await navigator.clipboard.writeText(value);
      if (current === sequence.current)
        setNotice(
          'Contenido copiado. Puedes borrar el portapapeles desde tu sistema.',
        );
    } catch {
      if (current === sequence.current)
        setError(
          'No se pudo copiar. Selecciona el contenido visible y cópialo con el teclado.',
        );
    }
  }

  async function downloadPng() {
    if (!result) return;
    const current = sequence.current;
    const canvas = qrToCanvas(result.qr);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png'),
      );
      if (current !== sequence.current) return;
      if (!blob)
        throw new Error('No se pudo exportar el PNG. Prueba descargar el SVG.');
      downloadBlob(blob, 'ceronube-qr.png');
    } catch (failure) {
      if (current === sequence.current)
        setError(
          failure instanceof Error
            ? failure.message
            : 'No se pudo descargar el PNG.',
        );
    } finally {
      canvas.width = canvas.height = 0;
    }
  }

  const content = mode === 'create' ? (result?.content ?? '') : decoded;
  const link = getQrLink(content);
  const field = (
    name: keyof Fields,
    label: string,
    options: { type?: string; placeholder?: string } = {},
  ) => (
    <div className="space-y-2">
      <label
        htmlFor={`qr-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`}
        className="text-sm font-medium"
      >
        {label}
      </label>
      <Input
        id={`qr-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`}
        value={fields[name]}
        type={options.type ?? 'text'}
        placeholder={options.placeholder}
        onChange={(event) => update(name, event.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );

  return (
    <section className="space-y-5" aria-label="Taller QR">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={mode === 'create' ? 'default' : 'outline'}
          aria-pressed={mode === 'create'}
          onClick={() => {
            clear();
            setMode('create');
          }}
        >
          <QrCode aria-hidden="true" />
          Crear QR
        </Button>
        <Button
          variant={mode === 'read' ? 'default' : 'outline'}
          aria-pressed={mode === 'read'}
          onClick={() => {
            clear();
            setMode('read');
          }}
        >
          <ImageUp aria-hidden="true" />
          Leer imagen
        </Button>
        <Button variant="ghost" onClick={clear}>
          <RotateCcw aria-hidden="true" />
          Limpiar sesión
        </Button>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        Los datos se procesan en este navegador y se mantienen en memoria. El
        motor se carga al generar o leer. Ningún contenido se envía para
        procesarlo.
      </p>
      <a
        href="/qr-licenses.txt"
        target="_blank"
        rel="noopener noreferrer"
        referrerPolicy="no-referrer"
        className="inline-flex min-h-10 items-center text-xs text-muted-foreground underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        Licencias de los motores QR
      </a>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="min-w-0 rounded-3xl border bg-card p-5 sm:p-6">
          {mode === 'create' ? (
            <form
              ref={form}
              autoComplete="off"
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void generate();
              }}
            >
              <div className="space-y-2">
                <label htmlFor="qr-kind" className="text-sm font-medium">
                  Contenido del QR
                </label>
                <NativeSelect
                  id="qr-kind"
                  className="w-full"
                  value={kind}
                  onChange={(event) => {
                    clear();
                    setKind(event.target.value as QrInput['kind']);
                  }}
                >
                  <NativeSelectOption value="text">Texto</NativeSelectOption>
                  <NativeSelectOption value="url">
                    Enlace URL
                  </NativeSelectOption>
                  <NativeSelectOption value="wifi">
                    Red Wi-Fi
                  </NativeSelectOption>
                  <NativeSelectOption value="contact">
                    Contacto
                  </NativeSelectOption>
                </NativeSelect>
              </div>
              {kind === 'text' && (
                <div className="space-y-2">
                  <label htmlFor="qr-text" className="text-sm font-medium">
                    Texto
                  </label>
                  <Textarea
                    id="qr-text"
                    autoComplete="off"
                    className="min-h-40 font-mono"
                    value={fields.text}
                    onChange={(event) => update('text', event.target.value)}
                    spellCheck={false}
                  />
                  <p className="text-xs text-muted-foreground">
                    {new TextEncoder().encode(fields.text).length} /{' '}
                    {QR_MAX_BYTES} bytes UTF-8. Se conservan acentos y saltos de
                    línea.
                  </p>
                </div>
              )}
              {kind === 'url' && (
                <>
                  {field('url', 'URL completa', {
                    placeholder: 'https://ejemplo.com',
                  })}
                  <p className="text-xs text-muted-foreground">
                    Incluye http:// o https://. El QR conserva exactamente la
                    URL que escribes.
                  </p>
                </>
              )}
              {kind === 'wifi' && (
                <>
                  {field('ssid', 'Nombre de la red (SSID)')}
                  <div className="space-y-2">
                    <label
                      htmlFor="qr-security"
                      className="text-sm font-medium"
                    >
                      Seguridad de la red
                    </label>
                    <NativeSelect
                      id="qr-security"
                      className="w-full"
                      value={security}
                      onChange={(event) => {
                        invalidate();
                        setSecurity(event.target.value as typeof security);
                        setFields((current) => ({ ...current, password: '' }));
                      }}
                    >
                      <NativeSelectOption value="WPA">
                        WPA / WPA2 personal
                      </NativeSelectOption>
                      <NativeSelectOption value="WEP">WEP</NativeSelectOption>
                      <NativeSelectOption value="nopass">
                        Sin contraseña
                      </NativeSelectOption>
                    </NativeSelect>
                  </div>
                  {security !== 'nopass' && (
                    <>
                      {field('password', 'Contraseña Wi-Fi', {
                        type: showPassword ? 'text' : 'password',
                      })}
                      <label className="flex min-h-10 items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={showPassword}
                          onChange={(event) =>
                            setShowPassword(event.target.checked)
                          }
                        />
                        Mostrar contraseña
                      </label>
                    </>
                  )}
                  <label className="flex min-h-10 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={hidden}
                      onChange={(event) => {
                        invalidate();
                        setHidden(event.target.checked);
                      }}
                    />
                    Red oculta
                  </label>
                  <p className="text-xs leading-5 text-muted-foreground">
                    El QR incluye la contraseña. Compártelo únicamente con las
                    personas que pueden usar la red. WPA3 y redes empresariales
                    no se incluyen.
                  </p>
                </>
              )}
              {kind === 'contact' && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {field('firstName', 'Nombre')}
                    {field('lastName', 'Apellido')}
                  </div>
                  {field('phone', 'Teléfono (opcional)', { type: 'tel' })}
                  {field('email', 'Correo electrónico (opcional)', {
                    type: 'email',
                  })}
                  {field('organization', 'Organización (opcional)')}
                  <p className="text-xs text-muted-foreground">
                    Contacto vCard 3.0. La importación depende del lector que
                    reciba el QR.
                  </p>
                </>
              )}
              <p className="text-xs leading-5 text-muted-foreground">
                Máximo {QR_MAX_BYTES} bytes UTF-8 en total, incluidos los campos
                y sus escapes. Negro sobre blanco, margen de 4 módulos y
                corrección M. Un QR largo necesita más espacio para leerse.
              </p>
              <Button type="submit" disabled={busy}>
                {busy ? 'Generando QR…' : 'Generar QR'}
              </Button>
            </form>
          ) : (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold">
                Elige una imagen con un QR
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                PNG, JPEG o WebP de hasta 8 MiB y 2048 × 2048 píxeles. Se lee un
                código por imagen. Incluye el margen y usa una captura nítida.
                El lector se carga al seleccionar la imagen y no solicita
                cámara.
              </p>
              <label
                htmlFor="qr-image-input"
                className="block text-sm font-medium"
              >
                Imagen local
              </label>
              <Input
                ref={fileInput}
                id="qr-image-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void readImage(file);
                }}
              />
              {busy && (
                <output className="block text-sm text-muted-foreground">
                  Leyendo el QR en este dispositivo…
                </output>
              )}
            </div>
          )}
          {busy && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                cancel();
                setNotice('Operación cancelada.');
              }}
            >
              Cancelar
            </Button>
          )}
        </div>
        <div className="min-w-0 space-y-5 rounded-3xl border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold">
            {mode === 'create' ? 'Vista previa y descarga' : 'Contenido leído'}
          </h2>
          {result && mode === 'create' && (
            <>
              <div className="mx-auto w-fit max-w-full rounded-xl border bg-white p-2">
                <canvas
                  ref={preview}
                  role="img"
                  aria-label="Vista previa del QR generado"
                  className="h-auto w-full max-w-80"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void downloadPng()}>
                  <Download aria-hidden="true" />
                  Descargar PNG
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadBlob(
                      new Blob([qrToSvg(result.qr)], { type: 'image/svg+xml' }),
                      'ceronube-qr.svg',
                    )
                  }
                >
                  <Download aria-hidden="true" />
                  Descargar SVG
                </Button>
              </div>
            </>
          )}
          {content ? (
            <div className="space-y-3">
              <label htmlFor="qr-content" className="text-sm font-medium">
                Contenido completo{' '}
                {kind === 'wifi' && mode === 'create'
                  ? '(incluye la contraseña Wi-Fi)'
                  : ''}
              </label>
              <Textarea
                id="qr-content"
                className="min-h-40 break-all font-mono"
                readOnly
                value={content}
                spellCheck={false}
              />
              <Button variant="secondary" onClick={() => void copy(content)}>
                <Clipboard aria-hidden="true" />
                Copiar contenido
              </Button>
              {link && (
                <div className="space-y-2">
                  <p className="break-all text-sm">
                    URL completa: <span className="font-mono">{content}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Protocolo: {link.protocol} Al abrir, visitarás otro sitio
                    que puede recibir datos del enlace.
                  </p>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="inline-flex min-h-10 items-center rounded-lg border px-3 text-sm underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    Abrir enlace en otra pestaña
                  </a>
                </div>
              )}
              {mode === 'read' && !link && (
                <p className="text-xs text-muted-foreground">
                  El contenido se muestra como texto. Solo se ofrece abrir
                  enlaces completos http:// y https://, sin credenciales.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              {mode === 'create'
                ? 'Escribe tus datos y pulsa Generar QR para revisar el resultado.'
                : 'El contenido aparecerá aquí después de leer la imagen. Los enlaces nunca se abren automáticamente.'}
            </p>
          )}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <output
        aria-live="polite"
        className="block min-h-6 text-sm text-muted-foreground"
      >
        {notice}
      </output>
    </section>
  );
}
