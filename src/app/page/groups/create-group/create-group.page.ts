import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from 'src/app/service/utils/toast.service'; // Assuming you have this service

@Component({
  selector: 'app-create-group',
  templateUrl: './create-group.page.html',
  styleUrls: ['./create-group.page.scss'],
})
export class CreateGroupPage implements OnInit {
  createGroupForm: FormGroup;
  groupImagePreview: string | ArrayBuffer | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private toastService: ToastService, // Using ToastService instead of AlertController
    private router: Router
  ) {}

  ngOnInit() {
    // Using FormBuilder for robust form management and validation
    this.createGroupForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      location: [''],
      isPrivate: [true, Validators.required],
      // The actual file object will be handled separately, not in the form group
    });
  }

  // Handles the file selection for the group image
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // For preview purposes
      const reader = new FileReader();
      reader.onload = () => {
        this.groupImagePreview = reader.result;
      };
      reader.readAsDataURL(file);

      // Here you would typically handle the file upload to a server
      // or store the file object to be sent with the form data.
      // For now, we'll just log it.
      console.log('File selected:', file);
    }
  }

  registerGroup() {
    if (this.createGroupForm.invalid) {
      // Corrected: Removed the 4th argument (color)
      this.toastService.presentToast('Please fill out all required fields correctly.', 'bottom', 3000);
      return;
    }

    // Construct the data to be sent to the API
    const groupData = this.createGroupForm.value;
    
    // In a real app, you would use FormData to send the image file along with the data
    // const formData = new FormData();
    // formData.append('name', groupData.name);
    // ... etc.

    console.log('Submitting Group Data:', groupData);

    // Replace with your actual API endpoint
    this.http.post('https://your-api-url.com/api/groups', groupData).subscribe(
      (response) => {
        // Corrected: Removed the 4th argument (color)
        this.toastService.presentToast('Club created successfully!', 'bottom', 2000);
        // Navigate to the new group's page or back to the list
        this.router.navigate(['/home']); // Or perhaps to the new group's detail page
      },
      (error) => {
        console.error('Error creating group:', error);
        // Corrected: Removed the 4th argument (color)
        this.toastService.presentToast('Error creating club. Please try again.', 'bottom', 3000);
      }
    );
  }
}
