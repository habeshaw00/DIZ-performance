
import React, { useState, useRef } from 'react';
import { db } from '../services/mockDb';

interface ProfilePhotoModalProps {
  userId: string;
  onClose: () => void;
  onUpdate: (dataUrl: string) => void;
}

const ProfilePhotoModal: React.FC<ProfilePhotoModalProps> = ({ userId, onClose, onUpdate }) => {
  const [mode, setMode] = useState<'selection' | 'camera'>('selection');
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Error accessing camera: " + err);
      setMode('selection');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        savePhoto(dataUrl);
        
        // Stop camera
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        savePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const savePhoto = async (dataUrl: string) => {
    setLoading(true);
    await db.updateProfilePic(userId, dataUrl);
    onUpdate(dataUrl);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-md rounded-2xl border border-white/10 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Update Profile Photo</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">✕</button>
        </div>

        {mode === 'selection' ? (
          <div className="space-y-4">
            <button 
              onClick={startCamera}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold transition-all"
            >
              <span>📷</span> Take Photo
            </button>
            <label className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 py-4 rounded-xl font-bold transition-all cursor-pointer">
              <span>📁</span> Choose from Files
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-white/10">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-3">
              <button 
                onClick={() => setMode('selection')}
                className="flex-1 bg-white/10 py-3 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={capturePhoto}
                disabled={loading}
                className="flex-2 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold px-8 shadow-lg shadow-blue-600/20"
              >
                {loading ? 'Processing...' : 'Capture'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePhotoModal;
