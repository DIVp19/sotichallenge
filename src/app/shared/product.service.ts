import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface ProductDTO {
  id: string;
  recipientAddress: string;
  carrierName: string;
  trackingNumber: string;
  weight: string;
  barcodeValue: string;
  qrValue: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  getProduct(): Observable<ProductDTO> {
    // Mocked example data; replace with HttpClient call later
    return of({
      id: 'ORDER-987654',
      recipientAddress: 'John Doe\n123 Market St\nSan Francisco, CA 94103',
      carrierName: 'Carrier Name',
      trackingNumber: '1Z999AA10123456784',
      weight: '2.5 kg',
      barcodeValue: 'xxxxxxxxxxxxxxxxxxx',
      qrValue: 'https://tracking.example.com/1Z999AA10123456784'
    });
  }
}
