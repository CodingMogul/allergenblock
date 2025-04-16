import { readFile } from 'fs/promises';
import { processCameraImage, processImageWithGemini } from './cameraUploadData';
import { storeRestaurantWithMenu } from './restaurantService';

async function convertFileToBase64(filePath: string): Promise<string> {
  try {
    const fileBuffer = await readFile(filePath);
    const base64String = fileBuffer.toString('base64');
    return `data:image/jpeg;base64,${base64String}`;
  } catch (error) {
    console.error('Error converting file to base64:', error);
    throw error;
  }
}

async function testImageUpload(imagePath: string) {
  try {
    console.log('1. Converting image to base64...');
    const base64Image = await convertFileToBase64(imagePath);
    
    console.log('2. Processing image with camera functions...');
    const cameraData = await processCameraImage(base64Image);
    console.log('Processed menu items:', cameraData.menuItems);

    console.log('3. Storing restaurant data...');
    const success = await storeRestaurantWithMenu({
      restaurantName: "Test Restaurant",
      location: { lat: 37.7749, lng: -122.4194 },
      menuItems: cameraData.menuItems,
      source: 'camera'
    });

    if (success) {
      console.log('Successfully stored restaurant data!');
    } else {
      console.log('Failed to store restaurant data.');
    }

    return {
      success,
      menuItems: cameraData.menuItems
    };
  } catch (error) {
    console.error('Error in test image upload:', error);
    throw error;
  }
}

// Example usage:
// Replace 'path/to/your/image.jpg' with your actual image path
testImageUpload('path/to/your/image.jpg')
  .then(result => console.log('Test completed:', result))
  .catch(error => console.error('Test failed:', error)); 