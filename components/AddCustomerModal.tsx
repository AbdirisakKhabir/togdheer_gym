// components/CustomerModal.tsx
import { useState, useRef, useEffect } from 'react';
import { Customer } from '@/types/customer';
import Swal from 'sweetalert2';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate?: (customerId: string, customer: Partial<Customer>) => void;
  customer?: Customer | null;
}

export default function CustomerModal({ 
  isOpen, 
  onClose, 
  onSave, 
  onUpdate, 
  customer 
}: CustomerModalProps) {
  const isEditMode = Boolean(customer);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    registerDate: new Date().toISOString().split('T')[0],
    expireDate: '',
    fee: '',
    gender: 'male',
    image: ''
  });
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Reset form when modal opens/closes or customer changes
  useEffect(() => {
    if (isOpen) {
      if (customer) {
        // Edit mode - populate form with customer data
        setFormData({
          name: customer.name,
          phone: customer.phone || '',
          registerDate: customer.registerDate ? new Date(customer.registerDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          expireDate: customer.expireDate ? new Date(customer.expireDate).toISOString().split('T')[0] : '',
          fee: customer.fee.toString(),
          gender: customer.gender,
          image: customer.image || ''
        });
        setPreviewImage(customer.image || '');
      } else {
        // Add mode - reset form
        setFormData({
          name: '',
          phone: '',
          registerDate: new Date().toISOString().split('T')[0],
          expireDate: '',
          fee: '',
          gender: 'male',
          image: ''
        });
        setPreviewImage('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  }, [isOpen, customer]);

  // Clean up camera stream when modal closes or camera is hidden
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      Swal.fire({
        icon: 'error',
        title: 'Camera Error',
        text: 'Unable to access camera. Please check permissions.',
        timer: 3000,
      });
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      // Set preview and form data
      setPreviewImage(imageDataUrl);
      setFormData(prev => ({ ...prev, image: imageDataUrl }));
      
      // Stop camera
      stopCamera();
      
      Swal.fire({
        icon: 'success',
        title: 'Photo Captured!',
        text: 'Photo has been captured successfully.',
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'error',
          title: 'File too large',
          text: 'Please select an image smaller than 5MB',
          timer: 2000,
          showConfirmButton: false,
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid file type',
          text: 'Please select an image file',
          timer: 2000,
          showConfirmButton: false,
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreviewImage(result);
        setFormData(prev => ({ ...prev, image: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPreviewImage('');
    setFormData(prev => ({ ...prev, image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.registerDate || !formData.fee || !formData.gender) {
        Swal.fire({
          icon: "error",
          title: "Missing Fields",
          text: "Please fill in all required fields",
          timer: 2000,
          showConfirmButton: false,
        });
        setIsLoading(false);
        return;
      }

      const submitFormData = new FormData();
      submitFormData.append("name", formData.name);
      
      if (formData.phone.trim()) {
        submitFormData.append("phone", formData.phone);
      }
      
      submitFormData.append("registerDate", formData.registerDate);

      if (formData.expireDate) {
        submitFormData.append("expireDate", formData.expireDate);
      }

      submitFormData.append("fee", formData.fee);
      submitFormData.append("gender", formData.gender);

      if (fileInputRef.current?.files?.[0]) {
        submitFormData.append("image", fileInputRef.current.files[0]);
      } else if (formData.image && formData.image.startsWith('data:image')) {
        // Convert base64 image to file for camera photos
        const base64Response = await fetch(formData.image);
        const blob = await base64Response.blob();
        const file = new File([blob], 'profile-photo.jpg', { type: 'image/jpeg' });
        submitFormData.append("image", file);
      }

      let response;
      if (isEditMode && customer) {
        // Update existing customer
        response = await fetch(`/api/customer/${customer.id}`, {
          method: "PUT",
          body: submitFormData,
        });
      } else {
        response = await fetch("/api/customer", {
          method: "POST",
          body: submitFormData,
        });
      }

      // Check if response is OK first
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorText = await response.text();
          if (errorText) {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorData.message || errorMessage;
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      // Parse the successful response
      let resultCustomer;
      try {
        const responseText = await response.text();
        if (responseText) {
          resultCustomer = JSON.parse(responseText);
        } else {
          throw new Error('Empty response from server');
        }
      } catch (parseError) {
        console.error('Error parsing success response:', parseError);
        throw new Error('Invalid response from server');
      }

  

      // WhatsApp notification only for new customers
      if (!isEditMode && formData.phone.trim()) {
        try {
          console.log('Sending WhatsApp welcome message to customer');
          
          await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: formData.phone,
              name: formData.name,
              gender: formData.gender,
              fee: formData.fee,
              registerDate: formData.registerDate,
              messageType: 'welcome'
            }),
          });

          console.log('WhatsApp message sent successfully');

        } catch (whatsappError) {
          // Just log WhatsApp errors but don't throw them
          console.warn('WhatsApp message failed:', whatsappError);
        }
      }

      // Call the appropriate callback - DON'T show SweetAlert here
      if (isEditMode && customer && onUpdate) {
     
        onUpdate(customer.id, {
          name: formData.name,
          phone: formData.phone.trim() || null,
          registerDate: new Date(formData.registerDate + "T00:00:00.000Z"),
          expireDate: formData.expireDate ? new Date(formData.expireDate + "T00:00:00.000Z") : null,
          fee: parseFloat(formData.fee),
          gender: formData.gender,
          image: formData.image,
          isActive: customer.isActive,
        });
      } else if (onSave) {
      
        onSave({
          name: formData.name,
          phone: formData.phone.trim() || null,
          registerDate: new Date(formData.registerDate + "T00:00:00.000Z"),
          expireDate: formData.expireDate ? new Date(formData.expireDate + "T00:00:00.000Z") : null,
          fee: parseFloat(formData.fee),
          gender: formData.gender,
          balance: 0,
          image: formData.image,
          isActive: true,
        });
      }



      onClose();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} customer:`, error);
      await Swal.fire({
        icon: "error",
        title: `${isEditMode ? 'Update' : 'Creation'} Failed`,
        text: error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} customer. Please try again.`,
        timer: 3000,
        showConfirmButton: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-10 flex items-center justify-center p-4 z-50 backdrop-blur-[1px]">
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Take Photo</h3>
              <button
                onClick={stopCamera}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="relative bg-black rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={stopCamera}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Member' : 'Add New Member'}
          </h2>
          <p className="text-gray-600 mt-2">
            {isEditMode ? 'Update customer details' : 'Enter customer details to create a new membership'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
          {/* Image Upload Section */}
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-32 h-32 rounded-2xl border-4 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Upload Button */}
              <button
                type="button"
                onClick={triggerFileInput}
                disabled={isLoading}
                className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>

              {/* Camera Button */}
              <button
                type="button"
                onClick={startCamera}
                disabled={isLoading}
                className="absolute bottom-0 left-0 bg-green-500 text-white p-2 rounded-full shadow-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Remove Button */}
              {previewImage && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={isLoading}
                  className="absolute top-0 right-0 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isLoading}
            />
            
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600 font-medium">
                Profile Picture
              </p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Upload from file or use camera to take a photo
              </p>
              <div className="flex justify-center gap-4 mt-2">
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  📁 Upload File
                </button>
                <button
                  type="button"
                  onClick={startCamera}
                  className="text-xs text-green-600 hover:text-green-800 font-medium"
                >
                  📷 Take Photo
                </button>
              </div>
            </div>
          </div>

          {/* Rest of the form remains the same */}
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg text-gray-900 bg-white placeholder-gray-500 disabled:opacity-50"
                placeholder="Enter customer name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Phone Number <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg text-gray-900 bg-white placeholder-gray-500 disabled:opacity-50"
                placeholder="Enter phone number (optional)"
              />
              <p className="text-xs text-gray-500 mt-1">
                {!isEditMode && 'WhatsApp messages will only be sent if phone number is provided'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Gender *
              </label>
              <select
                name="gender"
                required
                value={formData.gender}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg text-gray-900 bg-white disabled:opacity-50"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Registration Date *
              </label>
              <input
                type="date"
                name="registerDate"
                required
                value={formData.registerDate}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg text-gray-900 bg-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Expire Date
              </label>
              <input
                type="date"
                name="expireDate"
                value={formData.expireDate}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg text-gray-900 bg-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Membership Fee *
              </label>
              <input
                type="number"
                name="fee"
                required
                step="0.01"
                min="0"
                value={formData.fee}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg text-gray-900 bg-white placeholder-gray-500 disabled:opacity-50"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold hover:scale-105 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold hover:scale-105 shadow-lg disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isEditMode ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                isEditMode ? 'Update Member' : 'Add Member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}