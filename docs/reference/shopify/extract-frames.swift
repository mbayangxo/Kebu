import Foundation
import AVFoundation
import AppKit
import CoreGraphics

let srcPath = CommandLine.arguments[1]
let outDir = CommandLine.arguments[2]
let url = URL(fileURLWithPath: srcPath)
let asset = AVURLAsset(url: url)

let duration: Double = {
  let sem = DispatchSemaphore(value: 0)
  var seconds: Double = 0
  asset.loadValuesAsynchronously(forKeys: ["duration"]) {
    var error: NSError?
    let status = asset.statusOfValue(forKey: "duration", error: &error)
    if status == .loaded {
      seconds = CMTimeGetSeconds(asset.duration)
    }
    sem.signal()
  }
  _ = sem.wait(timeout: .now() + 30)
  return seconds
}()

print("duration=\(duration)")
guard duration.isFinite, duration > 0 else {
  fputs("bad duration\n", stderr)
  exit(1)
}

let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.maximumSize = CGSize(width: 1400, height: 1400)
let count = min(24, max(8, Int(duration / 5.0)))
try FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

for i in 0..<count {
  let t = duration * Double(i) / Double(max(count - 1, 1))
  var actual = CMTime.zero
  let time = CMTime(seconds: t, preferredTimescale: 600)
  do {
    let cg = try gen.copyCGImage(at: time, actualTime: &actual)
    let rep = NSBitmapImageRep(cgImage: cg)
    let props: [NSBitmapImageRep.PropertyKey: Any] = [.compressionFactor: 0.75]
    guard let data = rep.representation(using: .jpeg, properties: props) else { continue }
    let name = String(format: "frame-%03d.jpg", i + 1)
    let path = (outDir as NSString).appendingPathComponent(name)
    try data.write(to: URL(fileURLWithPath: path))
    print("wrote \(name) @ \(String(format: "%.1f", t))s")
  } catch {
    print("skip \(i): \(error)")
  }
}
