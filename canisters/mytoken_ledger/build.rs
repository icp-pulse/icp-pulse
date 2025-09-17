use std::env;
use std::path::PathBuf;

fn main() {
    let archive_path = PathBuf::from(
        env::var("ICRC1_ARCHIVE_WASM_PATH").unwrap_or_else(|_| {
            format!(
                "{}/../archive/ic-icrc1-archive.wasm.gz",
                env::var("OUT_DIR").unwrap()
            )
        }),
    );

    println!("cargo:rerun-if-changed={}", archive_path.to_string_lossy());
    println!("cargo:rerun-if-env-changed=ICRC1_ARCHIVE_WASM_PATH");
    println!(
        "cargo:rustc-env=ICRC1_ARCHIVE_WASM_PATH={}",
        archive_path.to_string_lossy()
    );
}