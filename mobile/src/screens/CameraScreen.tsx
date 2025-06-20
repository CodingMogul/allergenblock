import React, { useRef, useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Image } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation'; // adjust path if needed
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';

const CameraScreen = () => {
  const cameraRef = useRef<any>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState<'scan' | 'gallery'>('scan');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [reviewUri, setReviewUri] = useState<string | null>(null);
  // Delay flag for CameraView mounting
  const [camReady, setCamReady] = useState(false);

  useEffect(() => {
    let timeout: number;
    if (permission?.granted) {
      timeout = setTimeout(() => {
        setCamReady(true);
      }, 500); // 500ms delay for stability
    }
    return () => clearTimeout(timeout);
  }, [permission?.granted]);

  useFocusEffect(
    React.useCallback(() => {
      setCamReady(false);
      return () => {
        setCamReady(false);
      };
    }, [])
  );

  useEffect(() => {
    return () => {};
  }, [route]);

  const takePicture = async () => {
    if (!cameraRef.current) {
      setCameraError('Camera not ready.');
      return;
    }
    try {
      const photo = await cameraRef.current.takePictureAsync();
      setReviewUri(photo.uri);
    } catch (err: any) {
      setCameraError('Failed to take picture: ' + (err?.message || err));
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
        base64: false,
        exif: false,
        allowsEditing: false,
        aspect: [4, 3],
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (!result.canceled) {
        setReviewUri(result.assets[0].uri);
      }
    } catch (err: any) {
      setCameraError('Failed to pick image: ' + (err?.message || err));
    }
  };

  if (!permission) {
    return <View />;
  }
  if (!permission.granted) {
    return (
      <View style={styles.overlay}>
        <Text style={{ color: '#222', marginBottom: 12 }}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.actionButton}>
          <Text>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (cameraError) {
    return (
      <View style={styles.overlay}>
        <Text style={{ color: 'red', marginBottom: 12 }}>{cameraError}</Text>
        <TouchableOpacity onPress={() => setCameraError(null)} style={styles.actionButton}>
          <Text>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (reviewUri) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Image source={{ uri: reviewUri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        {/* Square guide overlay */}
        {scanMode !== 'gallery' && (
          <View style={styles.centerBoxContainer} pointerEvents="none">
            <View style={styles.centerBox}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </View>
        )}
        {/* Action buttons */}
        <View style={{ position: 'absolute', bottom: 48, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', zIndex: 10 }}>
          <TouchableOpacity style={styles.actionButton} onPress={() => {
            setReviewUri(null);
            setScanMode('scan');
            setCameraError(null);
          }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>{scanMode === 'scan' ? 'Retry' : 'Cancel'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => {
            navigation.navigate('Home', { photoUri: reviewUri });
          }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>Use Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {camReady && (
        <CameraView
          key={scanMode}
          style={StyleSheet.absoluteFill}
          facing={facing}
          ref={cameraRef}
          mute={true}
        />
      )}
      {/* X button in top left */}
      <TouchableOpacity
        style={{ position: 'absolute', top: 80, left: 24, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 20, padding: 6 }}
        onPress={() => {
          navigation.goBack();
        }}
        accessibilityLabel="Close camera"
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      >
        <Feather name="x" size={28} color="#222" />
      </TouchableOpacity>
      {/* White transparent box with corners */}
      {scanMode !== 'gallery' && (
        <View style={styles.centerBoxContainer} pointerEvents="none">
          <View style={styles.centerBox}>
            {/* Corners */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>
      )}
      {/* Mode buttons row above shutter */}
      <View style={styles.modeButtonsRow}>
        <TouchableOpacity
          style={[
            styles.smallModeButton,
            scanMode === 'scan' ? styles.smallModeButtonActive : styles.smallModeButtonInactive,
          ]}
          onPress={() => {
            setScanMode('scan');
          }}
        >
          <MaterialCommunityIcons name="food" size={20} color="#222" />
          <Text style={styles.smallModeButtonText}>Scan Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.smallModeButton,
            scanMode === 'gallery' ? styles.smallModeButtonActive : styles.smallModeButtonInactive,
          ]}
          onPress={() => {
            pickImageFromGallery();
          }}
        >
          <Feather name="image" size={20} color="#222" />
          <Text style={styles.smallModeButtonText}>Gallery</Text>
        </TouchableOpacity>
      </View>
      {/* Bottom row: Shutter only */}
      <View style={styles.bottomBarRow}>
        {/* Shutter button */}
        <TouchableOpacity
          style={styles.shutterButton}
          onPress={() => {
            if (scanMode === 'scan') {
              takePicture();
            } else {
              pickImageFromGallery();
            }
          }}
          accessibilityLabel="Shutter"
        >
          <View style={styles.shutterCircle} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  centerBoxContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  centerBox: {
    width: 260,
    height: 340,
    backgroundColor: 'transparent',
    borderRadius: 18,
    borderWidth: 0,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cornerTL: {
    top: -30,
    left: 0,
    borderTopWidth: 6,
    borderLeftWidth: 6,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: -30,
    right: 0,
    borderTopWidth: 6,
    borderRightWidth: 6,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 30,
    left: 0,
    borderBottomWidth: 6,
    borderLeftWidth: 6,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 30,
    right: 0,
    borderBottomWidth: 6,
    borderRightWidth: 6,
    borderBottomRightRadius: 8,
  },
  bottomBarRow: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    zIndex: 10,
  },
  modeButtonsRow: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
    gap: 18,
  },
  smallModeButton: {
    width: 88,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    marginHorizontal: 8,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  smallModeButtonActive: {
    backgroundColor: 'rgba(255,255,255,1)',
  },
  smallModeButtonInactive: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  smallModeButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 2,
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  shutterCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#eee',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 32,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#222',
  },
});

export default CameraScreen; 