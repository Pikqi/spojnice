{ pkgs ? import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/nixos-unstable.tar.gz") {} }:

pkgs.mkShell {
  packages = with pkgs; [
    nodejs_24
    pnpm
  ];

  shellHook = ''
    echo "Matching Game development shell"
    echo "Run: pnpm install && pnpm dev (0.0.0.0:4321)"
  '';
}
