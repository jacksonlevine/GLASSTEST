use anyhow::Context;
use image::{ImageBuffer, Rgba};
use std::{env, fs, path::PathBuf};

const SIZE: u32 = 512;
const IOR_AIR: f32 = 1.0;
const IOR_GLASS: f32 = 1.48;

#[derive(Clone, Copy)]
enum Shape {
    Pill,
    RoundedSquare,
    Droplet,
    WavySheet,
    ThickEdgeButton,
    MoltenPanel,
}

impl Shape {
    fn all() -> &'static [(&'static str, Shape)] {
        &[
            ("pill-card", Shape::Pill),
            ("rounded-square-lens", Shape::RoundedSquare),
            ("droplet", Shape::Droplet),
            ("wavy-sheet", Shape::WavySheet),
            ("thick-edge-button", Shape::ThickEdgeButton),
            ("molten-panel", Shape::MoltenPanel),
        ]
    }

    fn height(self, x: f32, y: f32) -> f32 {
        match self {
            Shape::Pill => lens_from_sdf(rounded_box(x, y, 0.99, 0.99, 0.34), 0.13, 1.06),
            Shape::RoundedSquare => lens_from_sdf(rounded_box(x, y, 0.99, 0.99, 0.2), 0.12, 1.04),
            Shape::Droplet => {
                let head = circle(x * 0.72, y + 0.04, 1.02);
                let neck = rounded_box(x * 0.74, y - 0.48, 0.48, 0.62, 0.28);
                let body = smooth_min(head, neck, 0.28);
                let lean = 1.0 + 0.12 * x - 0.1 * y;
                (lens_from_sdf(body, 0.12, 1.05) * lean).clamp(0.0, 1.0)
            }
            Shape::WavySheet => {
                let old_base = lens_from_sdf(rounded_box(x, y, 1.0, 1.0, 0.08), 0.08, 1.02);
                let smooth_center = smooth_rect_lens(x, y, 1.0, 1.0, 0.18);
                let center_blend = center_patch_mask(x, y, 0.46, 0.92);
                let base = old_base * (1.0 - center_blend) + smooth_center * center_blend;
                let ripple = 0.62
                    + 0.2 * (x * 9.0 + y * 2.0).sin()
                    + 0.12 * (y * 13.0 - x * 1.5).cos();
                (base * ripple).clamp(0.0, 1.0)
            }
            Shape::ThickEdgeButton => {
                let sdf = rounded_box(x, y, 0.99, 0.99, 0.28);
                let body = lens_from_sdf(sdf, 0.1, 1.02);
                let edge = (1.0 - (sdf.abs() / 0.12).clamp(0.0, 1.0)).powf(1.8);
                (body * 0.58 + edge * 0.54).clamp(0.0, 1.0)
            }
            Shape::MoltenPanel => {
                let wobble_x = x + 0.04 * (y * 8.0).sin() + 0.025 * (y * 17.0).cos();
                let wobble_y = y + 0.035 * (x * 7.0).cos();
                let sdf = rounded_box(wobble_x, wobble_y, 1.0, 1.0, 0.18);
                let base = lens_from_sdf(sdf, 0.12, 1.02);
                let swirl = 0.85 + 0.15 * ((x * 11.0).sin() * (y * 9.0).cos());
                (base * swirl).clamp(0.0, 1.0)
            }
        }
    }

    fn solid_thickness(self, x: f32, y: f32) -> f32 {
        match self {
            Shape::Pill => {
                let sdf = rounded_box(x, y, 0.99, 0.99, 0.34);
                slab_thickness_from_sdf(sdf, 0.22, 0.46, 0.48)
            }
            Shape::RoundedSquare => {
                let sdf = rounded_box(x, y, 0.99, 0.99, 0.2);
                slab_thickness_from_sdf(sdf, 0.2, 0.44, 0.42)
            }
            Shape::Droplet => {
                let head = circle(x * 0.72, y + 0.04, 1.02);
                let neck = rounded_box(x * 0.74, y - 0.48, 0.48, 0.62, 0.28);
                let body = smooth_min(head, neck, 0.28);
                let lower_mass = smoothstep(-0.12, 0.72, y) * 0.16;
                (slab_thickness_from_sdf(body, 0.24, 0.42, 0.5) + lower_mass).clamp(0.0, 1.0)
            }
            Shape::WavySheet => {
                let sdf = rounded_box(x, y, 1.0, 1.0, 0.08);
                let wave_depth = 0.08
                    * (0.5
                        + 0.5
                            * ((x * 4.8 + y * 1.4).sin() * 0.55
                                + (y * 5.2 - x * 0.9).cos() * 0.45));
                (slab_thickness_from_sdf(sdf, 0.18, 0.42, 0.46) + wave_depth).clamp(0.0, 1.0)
            }
            Shape::ThickEdgeButton => {
                let sdf = rounded_box(x, y, 0.99, 0.99, 0.28);
                slab_thickness_from_sdf(sdf, 0.3, 0.42, 0.62)
            }
            Shape::MoltenPanel => {
                let wobble_x = x + 0.04 * (y * 8.0).sin() + 0.025 * (y * 17.0).cos();
                let wobble_y = y + 0.035 * (x * 7.0).cos();
                let sdf = rounded_box(wobble_x, wobble_y, 1.0, 1.0, 0.18);
                slab_thickness_from_sdf(sdf, 0.26, 0.44, 0.5)
            }
        }
    }
}

fn main() -> anyhow::Result<()> {
    let out_dir = env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("../public/generated"));
    fs::create_dir_all(&out_dir).with_context(|| format!("creating {}", out_dir.display()))?;

    for (name, shape) in Shape::all() {
        let mut img = ImageBuffer::from_pixel(SIZE, SIZE, Rgba([128, 128, 128, 255]));
        for py in 0..SIZE {
            for px in 0..SIZE {
                let x = (px as f32 / (SIZE - 1) as f32) * 2.0 - 1.0;
                let y = (py as f32 / (SIZE - 1) as f32) * 2.0 - 1.0;
                let h = shape.height(x, y);
                if h <= 0.001 {
                    continue;
                }

                let e = 2.0 / SIZE as f32;
                let dhdx = (shape.height(x + e, y) - shape.height(x - e, y)) / (2.0 * e);
                let dhdy = (shape.height(x, y + e) - shape.height(x, y - e)) / (2.0 * e);
                let normal = normalize([-dhdx * 0.42, -dhdy * 0.42, 1.0]);

                let incoming = [0.0, 0.0, -1.0];
                let entering = refract(incoming, normal, IOR_AIR / IOR_GLASS).unwrap_or(incoming);
                let exiting = refract(entering, [0.0, 0.0, -1.0], IOR_GLASS / IOR_AIR).unwrap_or(entering);
                let optical_depth = 0.04 + h * 0.18;
                let dx = exiting[0] * optical_depth + normal[0] * h * 0.075;
                let dy = exiting[1] * optical_depth + normal[1] * h * 0.075;

                let red = encode_offset(dx, 2.3);
                let green = encode_offset(dy, 2.3);
                let thickness = encode_unit(trace_optical_thickness(*shape, x, y, h, entering) / 1.36);
                img.put_pixel(px, py, Rgba([red, green, thickness, 255]));
            }
        }

        let path = out_dir.join(format!("{name}.png"));
        img.save(&path).with_context(|| format!("saving {}", path.display()))?;
        println!("baked {}", path.display());
    }

    Ok(())
}

fn encode_offset(v: f32, gain: f32) -> u8 {
    ((0.5 + v * gain).clamp(0.0, 1.0) * 255.0).round() as u8
}

fn encode_unit(v: f32) -> u8 {
    (v.clamp(0.0, 1.0) * 255.0).round() as u8
}

fn trace_optical_thickness(shape: Shape, x: f32, y: f32, front_height: f32, ray: [f32; 3]) -> f32 {
    let solid = shape.solid_thickness(x, y);
    if solid <= 0.001 || ray[2] >= -0.0001 {
        return solid;
    }

    let front_z = front_surface_z(shape, x, y, front_height);
    let mut low = 0.0;
    let mut high = 2.4;

    for _ in 0..8 {
        let px = x + ray[0] * high;
        let py = y + ray[1] * high;
        let z = front_z + ray[2] * high;
        if z <= back_surface_z(shape, px, py) {
            break;
        }
        high *= 1.35;
    }

    for _ in 0..28 {
        let mid = (low + high) * 0.5;
        let px = x + ray[0] * mid;
        let py = y + ray[1] * mid;
        let z = front_z + ray[2] * mid;
        if z > back_surface_z(shape, px, py) {
            low = mid;
        } else {
            high = mid;
        }
    }

    high
}

fn front_surface_z(shape: Shape, x: f32, y: f32, front_height: f32) -> f32 {
    let solid = shape.solid_thickness(x, y);
    back_surface_z(shape, x, y) + solid + front_height * 0.18
}

fn back_surface_z(shape: Shape, x: f32, y: f32) -> f32 {
    -shape.solid_thickness(x, y) * 0.5
}

fn lens_from_sdf(sdf: f32, feather: f32, crown: f32) -> f32 {
    let inside = smoothstep(feather, -feather, sdf);
    let crown_shape = (1.0 - (sdf / crown).abs().clamp(0.0, 1.0).powf(2.0)).max(0.0);
    inside * crown_shape.sqrt()
}

fn slab_thickness_from_sdf(sdf: f32, edge_width: f32, base: f32, edge_gain: f32) -> f32 {
    let inside = smoothstep(0.04, -0.04, sdf);
    let rolled_edge = (1.0 - (sdf.abs() / edge_width).clamp(0.0, 1.0)).powf(1.65);
    (inside * (base + rolled_edge * edge_gain)).clamp(0.0, 1.0)
}

fn smooth_rect_lens(x: f32, y: f32, hx: f32, hy: f32, edge_width: f32) -> f32 {
    let sx = (x.abs() / hx).clamp(0.0, 1.0);
    let sy = (y.abs() / hy).clamp(0.0, 1.0);
    let inside_x = 1.0 - smoothstep(1.0 - edge_width, 1.0, sx);
    let inside_y = 1.0 - smoothstep(1.0 - edge_width, 1.0, sy);
    let edge_roll = (inside_x * inside_y).powf(0.42);
    let crown_x = 1.0 - sx.powf(2.35);
    let crown_y = 1.0 - sy.powf(2.35);
    (edge_roll * crown_x.max(0.0).powf(0.34) * crown_y.max(0.0).powf(0.34)).clamp(0.0, 1.0)
}

fn center_patch_mask(x: f32, y: f32, inner_radius: f32, outer_radius: f32) -> f32 {
    let radius = ((x * x + y * y).sqrt()).clamp(0.0, 1.0);
    1.0 - smoothstep(inner_radius, outer_radius, radius)
}

fn circle(x: f32, y: f32, r: f32) -> f32 {
    (x * x + y * y).sqrt() - r
}

fn rounded_box(x: f32, y: f32, hx: f32, hy: f32, r: f32) -> f32 {
    let qx = x.abs() - hx + r;
    let qy = y.abs() - hy + r;
    let ox = qx.max(0.0);
    let oy = qy.max(0.0);
    (ox * ox + oy * oy).sqrt() + qx.max(qy).min(0.0) - r
}

fn smooth_min(a: f32, b: f32, k: f32) -> f32 {
    let h = (0.5 + 0.5 * (b - a) / k).clamp(0.0, 1.0);
    b * h + a * (1.0 - h) - k * h * (1.0 - h)
}

fn smoothstep(edge0: f32, edge1: f32, x: f32) -> f32 {
    let t = ((x - edge0) / (edge1 - edge0)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

fn normalize(v: [f32; 3]) -> [f32; 3] {
    let l = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt().max(0.0001);
    [v[0] / l, v[1] / l, v[2] / l]
}

fn refract(i: [f32; 3], n: [f32; 3], eta: f32) -> Option<[f32; 3]> {
    let dot = i[0] * n[0] + i[1] * n[1] + i[2] * n[2];
    let k = 1.0 - eta * eta * (1.0 - dot * dot);
    if k < 0.0 {
        None
    } else {
        Some([
            eta * i[0] - (eta * dot + k.sqrt()) * n[0],
            eta * i[1] - (eta * dot + k.sqrt()) * n[1],
            eta * i[2] - (eta * dot + k.sqrt()) * n[2],
        ])
    }
}
