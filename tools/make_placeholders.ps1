<#
  Creates temporary images for every entry in data/assets.json that has no file yet.
  Each created file is recorded with its SHA-256 in assets/placeholders.json,
  so tools (and the future editor) can tell temporary images from final art.

  Usage (from the project folder):
    powershell -ExecutionPolicy Bypass -File tools\make_placeholders.ps1
    powershell -ExecutionPolicy Bypass -File tools\make_placeholders.ps1 -Refresh

  -Refresh also redraws files that are still unchanged temporary images
  (their checksum matches placeholders.json). Final art is never touched.
#>
param([switch]$Refresh)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$assets = Get-Content (Join-Path $root 'data\assets.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$phListPath = Join-Path $root 'assets\placeholders.json'
$phList = @{}
if (Test-Path $phListPath) {
  $old = Get-Content $phListPath -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($p in $old.files.PSObject.Properties) { $phList[$p.Name] = $p.Value }
}

function Col([string]$hex, [double]$alpha = 1.0) {
  $h = $hex.TrimStart('#')
  $r = [Convert]::ToInt32($h.Substring(0, 2), 16); $g = [Convert]::ToInt32($h.Substring(2, 2), 16); $b = [Convert]::ToInt32($h.Substring(4, 2), 16)
  return [Drawing.Color]::FromArgb([int](255 * $alpha), $r, $g, $b)
}
function Darker([Drawing.Color]$c, [double]$f = 0.6) {
  return [Drawing.Color]::FromArgb($c.A, [int]($c.R * $f), [int]($c.G * $f), [int]($c.B * $f))
}
function Lighter([Drawing.Color]$c, [double]$f = 0.5) {
  return [Drawing.Color]::FromArgb($c.A, [int]($c.R + (255 - $c.R) * $f), [int]($c.G + (255 - $c.G) * $f), [int]($c.B + (255 - $c.B) * $f))
}
function RoundRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90); $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90); $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure(); return $p
}
function Label($g, [string]$text, [float]$cx, [float]$cy, [float]$size, [Drawing.Color]$color) {
  $font = New-Object Drawing.Font('Arial', $size, [Drawing.FontStyle]::Bold, [Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object Drawing.StringFormat; $fmt.Alignment = 'Center'; $fmt.LineAlignment = 'Center'
  $br = New-Object Drawing.SolidBrush($color)
  $g.DrawString($text, $font, $br, (New-Object Drawing.RectangleF(($cx - 2000), ($cy - 400), 4000, 800)), $fmt)
  $font.Dispose(); $br.Dispose()
}
function ElementShape($g, [string]$shape, [Drawing.Color]$c, [float]$cx, [float]$cy, [float]$s) {
  $br = New-Object Drawing.SolidBrush($c); $pen = New-Object Drawing.Pen((Darker $c 0.55), [Math]::Max(2, $s / 14))
  $h = $s / 2
  switch ($shape) {
    'triangle' { $pts = [Drawing.PointF[]]@((New-Object Drawing.PointF($cx, ($cy - $h))), (New-Object Drawing.PointF(($cx + $h), ($cy + $h * 0.8))), (New-Object Drawing.PointF(($cx - $h), ($cy + $h * 0.8)))); $g.FillPolygon($br, $pts); $g.DrawPolygon($pen, $pts) }
    'circle'   { $g.FillEllipse($br, ($cx - $h), ($cy - $h), $s, $s); $g.DrawEllipse($pen, ($cx - $h), ($cy - $h), $s, $s) }
    'square'   { $q = $h * 0.85; $g.FillRectangle($br, ($cx - $q), ($cy - $q), ($q * 2), ($q * 2)); $g.DrawRectangle($pen, ($cx - $q), ($cy - $q), ($q * 2), ($q * 2)) }
    'rhombus'  { $pts = [Drawing.PointF[]]@((New-Object Drawing.PointF($cx, ($cy - $h))), (New-Object Drawing.PointF(($cx + $h * 0.75), $cy)), (New-Object Drawing.PointF($cx, ($cy + $h))), (New-Object Drawing.PointF(($cx - $h * 0.75), $cy))); $g.FillPolygon($br, $pts); $g.DrawPolygon($pen, $pts) }
  }
  $br.Dispose(); $pen.Dispose()
}

function Draw($key, $e) {
  $w = [int]$e.size[0]; $h = [int]$e.size[1]
  $ph = $e.ph
  $bmp = New-Object Drawing.Bitmap($w, $h, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([Drawing.Color]::Transparent)
  $alpha = 1.0; if ($ph.alpha) { $alpha = [double]$ph.alpha }
  $base = Col ($(if ($ph.color) { $ph.color } else { '#cccccc' })) $alpha
  $dark = Darker $base 0.55
  $shape = $ph.shape
  $labelText = $key
  $showLabel = $true

  if ($ph.shapes) {
    $n = $ph.shapes.Count
    $big = [bool]$ph.big
    if ($n -eq 1) { $s = $(if ($big) { $w * 0.82 } else { $w * 0.55 }); ElementShape $g $ph.shapes[0][0] (Col $ph.shapes[0][1]) ($w / 2) ($h / 2) $s }
    elseif ($n -eq 2) { ElementShape $g $ph.shapes[0][0] (Col $ph.shapes[0][1]) ($w * 0.36) ($h * 0.42) ($w * 0.5); ElementShape $g $ph.shapes[1][0] (Col $ph.shapes[1][1]) ($w * 0.64) ($h * 0.62) ($w * 0.5) }
    else { ElementShape $g $ph.shapes[0][0] (Col $ph.shapes[0][1]) ($w * 0.5) ($h * 0.3) ($w * 0.42); ElementShape $g $ph.shapes[1][0] (Col $ph.shapes[1][1]) ($w * 0.3) ($h * 0.68) ($w * 0.42); ElementShape $g $ph.shapes[2][0] (Col $ph.shapes[2][1]) ($w * 0.7) ($h * 0.68) ($w * 0.42) }
    $showLabel = $false
  }
  else {
    switch ($shape) {
      'titlebg' {
        $g.Clear($base)
        $br = New-Object Drawing.SolidBrush((Lighter $base 0.45)); $g.FillEllipse($br, 1050, 120, 760, 860); $br.Dispose()
        $br = New-Object Drawing.SolidBrush((Darker $base 0.85)); $g.FillRectangle($br, 0, 980, $w, 100); $br.Dispose()
        Label $g 'Title background (illustration on the right)' 1430 550 34 (Darker $base 0.4)
        $showLabel = $false
      }
      'shopbg' {
        $g.Clear($base)
        $br = New-Object Drawing.SolidBrush((Darker $base 0.8))
        foreach ($y in 140, 320, 500) { $g.FillRectangle($br, 80, $y, 380, 18); $g.FillRectangle($br, 1460, $y, 380, 18) }
        $br.Dispose()
        $br = New-Object Drawing.SolidBrush((Lighter $base 0.4)); foreach ($y in 140, 320, 500) { foreach ($x in 110, 190, 270, 350, 1490, 1570, 1650, 1730) { $g.FillEllipse($br, $x, ($y - 70), 50, 70) } }; $br.Dispose()
        $br = New-Object Drawing.SolidBrush((Darker $base 0.7)); $g.FillRectangle($br, 0, 760, $w, 320); $br.Dispose()
        Label $g 'bg_shop  1920 x 1080' 960 60 30 (Darker $base 0.45)
        $showLabel = $false
      }
      'workshopbg' {
        $g.Clear($base)
        $br = New-Object Drawing.SolidBrush((Darker $base 0.7)); $g.FillRectangle($br, 0, 700, $w, 380); $br.Dispose()
        $pen = New-Object Drawing.Pen((Darker $base 0.5), 6); $g.DrawLine($pen, 0, 700, $w, 700); $pen.Dispose()
        Label $g 'bg_workshop  1920 x 1080' 960 160 30 (Darker $base 0.45)
        $showLabel = $false
      }
      'portrait' {
        $g.Clear($base)
        $br = New-Object Drawing.SolidBrush((Darker $base 0.75))
        $g.FillEllipse($br, 90, 70, 120, 150); $g.FillEllipse($br, 30, 230, 240, 260)
        $br.Dispose()
        Label $g 'Heroine' 150 300 30 ([Drawing.Color]::White)
        Label $g $ph.label 150 340 26 ([Drawing.Color]::White)
        $showLabel = $false
      }
      'silhouette' {
        $br = New-Object Drawing.SolidBrush($base)
        $g.FillEllipse($br, 365, 140, 170, 220)
        $g.FillRectangle($br, 410, 330, 80, 100)
        $path = New-Object Drawing.Drawing2D.GraphicsPath
        $path.AddBezier(130, 1000, 140, 620, 260, 450, 450, 420)
        $path.AddBezier(450, 420, 640, 450, 760, 620, 770, 1000)
        $path.CloseFigure(); $g.FillPath($br, $path); $br.Dispose()
        Label $g $ph.label 450 640 40 ([Drawing.Color]::White)
        Label $g '900 x 1000' 450 700 28 ([Drawing.Color]::White)
        $showLabel = $false
      }
      'cathead' {
        $s = $w / 220.0
        $br = New-Object Drawing.SolidBrush($base)
        $g.FillPolygon($br, [Drawing.PointF[]]@((New-Object Drawing.PointF((48 * $s), (100 * $s))), (New-Object Drawing.PointF((40 * $s), (24 * $s))), (New-Object Drawing.PointF((100 * $s), (62 * $s)))))
        $g.FillPolygon($br, [Drawing.PointF[]]@((New-Object Drawing.PointF((172 * $s), (100 * $s))), (New-Object Drawing.PointF((180 * $s), (24 * $s))), (New-Object Drawing.PointF((120 * $s), (62 * $s)))))
        $g.FillEllipse($br, (36 * $s), (50 * $s), (148 * $s), (146 * $s)); $br.Dispose()
        $eye = New-Object Drawing.SolidBrush((Col '#f2c94c'))
        $g.FillEllipse($eye, (70 * $s), (100 * $s), (26 * $s), (30 * $s)); $g.FillEllipse($eye, (124 * $s), (100 * $s), (26 * $s), (30 * $s)); $eye.Dispose()
        $showLabel = $false
      }
      'catbody' {
        $br = New-Object Drawing.SolidBrush($base)
        $g.FillEllipse($br, 110, 230, 210, 280)
        $g.FillEllipse($br, 140, 90, 170, 160)
        $g.FillPolygon($br, [Drawing.PointF[]]@((New-Object Drawing.PointF(150, 140)), (New-Object Drawing.PointF(150, 40)), (New-Object Drawing.PointF(215, 100))))
        $g.FillPolygon($br, [Drawing.PointF[]]@((New-Object Drawing.PointF(300, 140)), (New-Object Drawing.PointF(305, 40)), (New-Object Drawing.PointF(240, 100))))
        $pen = New-Object Drawing.Pen($base, 26); $pen.StartCap = 'Round'; $pen.EndCap = 'Round'
        $g.DrawBezier($pen, 300, 470, 360, 440, 330, 330, 320, 300); $pen.Dispose(); $br.Dispose()
        $eye = New-Object Drawing.SolidBrush((Col '#f2c94c'))
        $g.FillEllipse($eye, 180, 150, 26, 30); $g.FillEllipse($eye, 245, 150, 26, 30); $eye.Dispose()
        $showLabel = $false
      }
      'cauldron' {
        $br = New-Object Drawing.SolidBrush($base); $g.FillEllipse($br, 30, 40, 560, 440); $br.Dispose()
        $br = New-Object Drawing.SolidBrush((Darker $base 0.6)); $g.FillRectangle($br, 140, 440, 50, 60); $g.FillRectangle($br, 430, 440, 50, 60); $br.Dispose()
        $br = New-Object Drawing.SolidBrush((Lighter $base 0.25)); $g.FillEllipse($br, 40, 20, 540, 140); $br.Dispose()
        $br = New-Object Drawing.SolidBrush((Darker $base 0.4)); $g.FillEllipse($br, 60, 40, 500, 110); $br.Dispose()
        Label $g 'cauldron  620 x 500' 310 455 22 (Lighter $base 0.6)
        $showLabel = $false
      }
      'ellipse' {
        # ph.area = [x, y, w, h]: draw the ellipse only there (rest stays transparent)
        $ex = 2; $ey = 2; $ew = $w - 4; $eh = $h - 4
        if ($ph.area) { $ex = [double]$ph.area[0]; $ey = [double]$ph.area[1]; $ew = [double]$ph.area[2]; $eh = [double]$ph.area[3] }
        $br = New-Object Drawing.SolidBrush($base); $g.FillEllipse($br, $ex, $ey, $ew, $eh); $br.Dispose()
        $br = New-Object Drawing.SolidBrush([Drawing.Color]::White); $g.FillEllipse($br, ($ex + $ew * 0.2), ($ey + $eh * 0.25), ($ew * 0.25), ($eh * 0.2)); $br.Dispose()
        $showLabel = $false
      }
      'page' {
        $p = RoundRect 4 4 ($w - 8) ($h - 8) 24
        $br = New-Object Drawing.SolidBrush($base); $g.FillPath($br, $p); $br.Dispose()
        $pen = New-Object Drawing.Pen((Darker $base 0.6), 6); $g.DrawPath($pen, $p); $pen.Dispose()
        $pen = New-Object Drawing.Pen((Darker $base 0.8), 2); $g.DrawRectangle($pen, 30, 30, ($w - 60), ($h - 60)); $pen.Dispose()
        Label $g 'recipe_page 560 x 580' ($w / 2) ($h - 18) 14 (Darker $base 0.5)
        $showLabel = $false
      }
      'bottle' {
        $s = $w / 128.0
        $glass = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(90, 220, 235, 245))
        $body = New-Object Drawing.Drawing2D.GraphicsPath; $body.AddEllipse((22 * $s), (40 * $s), (84 * $s), (82 * $s))
        $g.FillPath($glass, $body)
        $g.SetClip($body)
        $cols = $ph.colors; $bandW = (84 * $s) / $cols.Count
        for ($i = 0; $i -lt $cols.Count; $i++) { $br = New-Object Drawing.SolidBrush((Col $cols[$i])); $g.FillRectangle($br, (22 * $s + $i * $bandW), (70 * $s), ($bandW + 1), (60 * $s)); $br.Dispose() }
        $g.ResetClip()
        $pen = New-Object Drawing.Pen((Col '#4a3f52'), (3 * $s)); $g.DrawPath($pen, $body)
        $g.FillRectangle($glass, (50 * $s), (12 * $s), (28 * $s), (32 * $s)); $g.DrawRectangle($pen, (50 * $s), (12 * $s), (28 * $s), (32 * $s))
        $cork = New-Object Drawing.SolidBrush((Col '#a0784a')); $g.FillRectangle($cork, (52 * $s), (4 * $s), (24 * $s), (12 * $s)); $cork.Dispose()
        $pen.Dispose(); $glass.Dispose()
        $showLabel = $false
      }
      'logo' {
        $p = RoundRect 4 4 ($w - 8) ($h - 8) 40
        $br = New-Object Drawing.SolidBrush($base); $g.FillPath($br, $p); $br.Dispose()
        $pen = New-Object Drawing.Pen($dark, 8); $g.DrawPath($pen, $p); $pen.Dispose()
        Label $g 'Bonding Potion' ($w / 2) ($h / 2) 96 (Col '#3a2152')
        $showLabel = $false
      }
      'frame' {
        $inset = [int]$ph.inset
        $br = New-Object Drawing.SolidBrush($base); $g.FillRectangle($br, 0, 0, $w, $h); $br.Dispose()
        $g.CompositingMode = 'SourceCopy'
        $clear = New-Object Drawing.SolidBrush([Drawing.Color]::Transparent); $g.FillRectangle($clear, $inset, $inset, ($w - 2 * $inset), ($h - 2 * $inset)); $clear.Dispose()
        $g.CompositingMode = 'SourceOver'
        $showLabel = $false
      }
      'button' {
        $r = [Math]::Min(18, [Math]::Min($w, $h) / 4)
        $p = RoundRect 2 2 ($w - 4) ($h - 4) $r
        $br = New-Object Drawing.SolidBrush($base); $g.FillPath($br, $p); $br.Dispose()
        $bc = $(if ($ph.border) { Col $ph.border } else { $dark })
        $pen = New-Object Drawing.Pen($bc, 4); $g.DrawPath($pen, $p); $pen.Dispose()
        $showLabel = ($w -ge 400 -and $h -ge 400)
      }
      'textlabel' {
        # Transparent image with only text (and an optional underline), sized to fit.
        $txt = [string]$ph.text
        $tc = Col $ph.textColor
        $size = [float]($h * 0.62)
        $fmt = New-Object Drawing.StringFormat; $fmt.Alignment = 'Center'; $fmt.LineAlignment = 'Center'
        do {
          $font = New-Object Drawing.Font('Courier New', $size, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)
          $m = $g.MeasureString($txt, $font)
          if ($m.Width -gt ($w - 16)) { $font.Dispose(); $size -= 2 } else { break }
        } while ($size -gt 10)
        $br = New-Object Drawing.SolidBrush($tc)
        $ty = $(if ($ph.underline) { $h * 0.42 } else { $h / 2 })
        $g.DrawString($txt, $font, $br, (New-Object Drawing.RectangleF(0, ($ty - $h), $w, ($h * 2))), $fmt)
        if ($ph.underline) { $g.FillRectangle($br, 4, ($h - 14), ($w - 8), 4) }
        $br.Dispose(); $font.Dispose()
        $showLabel = $false
      }
      'softpanel' {
        # Semi-transparent light panel with blurred edges (layers of rounded rects, more opaque towards the middle).
        $steps = 14
        for ($i = 0; $i -lt $steps; $i++) {
          $inset = $i * 2
          $a = [int](255 * $alpha * (($i + 1) / $steps) * 0.22)
          $br = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb([Math]::Min(255, $a), $base.R, $base.G, $base.B))
          $p = RoundRect $inset $inset ($w - 2 * $inset) ($h - 2 * $inset) 30
          $g.FillPath($br, $p); $br.Dispose()
        }
        $showLabel = $false
      }
      'speech' {
        $p = RoundRect 4 4 ($w - 8) ($h - 44) 28
        $tail = [Drawing.PointF[]]@((New-Object Drawing.PointF(($w * 0.55), ($h - 42))), (New-Object Drawing.PointF(($w * 0.72), ($h - 42))), (New-Object Drawing.PointF(($w * 0.62), ($h - 3))))
        $br = New-Object Drawing.SolidBrush($base); $g.FillPath($br, $p); $g.FillPolygon($br, $tail); $br.Dispose()
        $pen = New-Object Drawing.Pen((Col $ph.border), 5)
        $g.DrawPath($pen, $p)
        $g.DrawLine($pen, ($w * 0.55), ($h - 40), ($w * 0.62), ($h - 3)); $g.DrawLine($pen, ($w * 0.72), ($h - 40), ($w * 0.62), ($h - 3))
        $pen.Dispose()
        $cover = New-Object Drawing.SolidBrush($base); $g.FillRectangle($cover, ($w * 0.55 + 3), ($h - 46), ($w * 0.17 - 6), 8); $cover.Dispose()
        $showLabel = $false
      }
      'arrow' {
        $p = RoundRect 3 3 ($w - 6) ($h - 6) 18
        $br = New-Object Drawing.SolidBrush($base); $g.FillPath($br, $p); $br.Dispose()
        $bc = Col $ph.border
        $pen = New-Object Drawing.Pen($bc, 4); $g.DrawPath($pen, $p); $pen.Dispose()
        $br = New-Object Drawing.SolidBrush($bc)
        $g.FillPolygon($br, [Drawing.PointF[]]@((New-Object Drawing.PointF(32, 46)), (New-Object Drawing.PointF(62, 46)), (New-Object Drawing.PointF(62, 26)), (New-Object Drawing.PointF(96, 60)), (New-Object Drawing.PointF(62, 94)), (New-Object Drawing.PointF(62, 74)), (New-Object Drawing.PointF(32, 74))))
        $br.Dispose(); $showLabel = $false
      }
      'cursor' {
        $pts = [Drawing.PointF[]]@((New-Object Drawing.PointF(8, 8)), (New-Object Drawing.PointF(8, 52)), (New-Object Drawing.PointF(20, 41)), (New-Object Drawing.PointF(29, 60)), (New-Object Drawing.PointF(37, 56)), (New-Object Drawing.PointF(28, 38)), (New-Object Drawing.PointF(44, 38)))
        $br = New-Object Drawing.SolidBrush($base); $g.FillPolygon($br, $pts); $br.Dispose()
        $pen = New-Object Drawing.Pen((Col $ph.border), 3); $g.DrawPolygon($pen, $pts); $pen.Dispose()
        $showLabel = $false
      }
      'bubble' {
        $br = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb(70, 255, 255, 255)); $g.FillEllipse($br, 14, 14, 100, 100); $br.Dispose()
        $pen = New-Object Drawing.Pen([Drawing.Color]::FromArgb(230, 255, 255, 255), 6); $g.DrawEllipse($pen, 14, 14, 100, 100); $pen.Dispose()
        $br = New-Object Drawing.SolidBrush([Drawing.Color]::White); $g.FillEllipse($br, 36, 32, 22, 16); $br.Dispose()
        $showLabel = $false
      }
      'star' {
        $pts = [Drawing.PointF[]]@((New-Object Drawing.PointF(64, 4)), (New-Object Drawing.PointF(76, 52)), (New-Object Drawing.PointF(124, 64)), (New-Object Drawing.PointF(76, 76)), (New-Object Drawing.PointF(64, 124)), (New-Object Drawing.PointF(52, 76)), (New-Object Drawing.PointF(4, 64)), (New-Object Drawing.PointF(52, 52)))
        $br = New-Object Drawing.SolidBrush([Drawing.Color]::White); $g.FillPolygon($br, $pts); $br.Dispose()
        $showLabel = $false
      }
      'smoke' {
        $path = New-Object Drawing.Drawing2D.GraphicsPath; $path.AddEllipse(4, 4, 120, 120)
        $pgb = New-Object Drawing.Drawing2D.PathGradientBrush($path)
        $pgb.CenterColor = [Drawing.Color]::FromArgb(200, $base.R, $base.G, $base.B)
        $pgb.SurroundColors = [Drawing.Color[]]@([Drawing.Color]::FromArgb(0, $base.R, $base.G, $base.B))
        $g.FillPath($pgb, $path); $pgb.Dispose()
        $showLabel = $false
      }
      default {
        $g.Clear($base)
        $pen = New-Object Drawing.Pen($dark, 6); $g.DrawRectangle($pen, 3, 3, ($w - 6), ($h - 6)); $pen.Dispose()
      }
    }
  }
  if ($showLabel -and $w -ge 200) {
    $fs = [Math]::Max(14, [Math]::Min(48, $w / 22))
    $ly = $(if ($w -ge 1920) { 140 } else { $h / 2 })
    Label $g $labelText ($w / 2) ($ly - $fs * 0.7) $fs (Darker $base 0.4)
    Label $g ("{0} x {1}" -f $w, $h) ($w / 2) ($ly + $fs * 0.7) ($fs * 0.8) (Darker $base 0.4)
  }
  $g.Dispose()
  return $bmp
}

$jpgCodec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$jpgParams = New-Object Drawing.Imaging.EncoderParameters(1)
$jpgParams.Param[0] = New-Object Drawing.Imaging.EncoderParameter([Drawing.Imaging.Encoder]::Quality, [long]85)

$made = 0; $skipped = 0
foreach ($prop in $assets.images.PSObject.Properties) {
  $key = $prop.Name; $e = $prop.Value
  $rel = $e.path
  $full = Join-Path $root ($rel -replace '/', '\')
  $exists = Test-Path $full
  if ($exists) {
    $isPh = $false
    if ($Refresh -and $phList.ContainsKey($rel)) {
      $hash = (Get-FileHash $full -Algorithm SHA256).Hash
      $isPh = ($hash -eq $phList[$rel])
    }
    if (-not $isPh) { $skipped++; continue }
  }
  New-Item -ItemType Directory -Force (Split-Path $full -Parent) | Out-Null
  $bmp = Draw $key $e
  if ($rel.ToLower().EndsWith('.jpg')) {
    $flat = New-Object Drawing.Bitmap($bmp.Width, $bmp.Height)
    $fg = [Drawing.Graphics]::FromImage($flat); $fg.Clear([Drawing.Color]::White); $fg.DrawImage($bmp, 0, 0); $fg.Dispose()
    $flat.Save($full, $jpgCodec, $jpgParams); $flat.Dispose()
  } else {
    $bmp.Save($full, [Drawing.Imaging.ImageFormat]::Png)
  }
  $bmp.Dispose()
  $phList[$rel] = (Get-FileHash $full -Algorithm SHA256).Hash
  $made++
}

$sorted = [ordered]@{}
foreach ($k in ($phList.Keys | Sort-Object)) { $sorted[$k] = $phList[$k] }
$json = [ordered]@{ '_note' = 'Images that are still temporary. Written by tools/make_placeholders.ps1. Remove an entry when its final art is in place.'; 'files' = $sorted } | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText($phListPath, $json, (New-Object Text.UTF8Encoding($false)))
Write-Output "Created $made image(s), kept $skipped existing file(s)."
