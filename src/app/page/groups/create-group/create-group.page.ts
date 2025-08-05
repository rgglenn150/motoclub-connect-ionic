import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from 'src/app/service/utils/toast.service';
import { GroupService, Group } from 'src/app/service/group.service'; // Import the service and interface

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
    private groupService: GroupService, // Inject GroupService
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit() {
    this.createGroupForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      location: [''],
      isPrivate: [true, Validators.required],
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.groupImagePreview = reader.result;
      };
      reader.readAsDataURL(file);
      console.log('File selected:', file);
    }
  }

  /**
   * Validates the form and uses the GroupService to create a new club.
   */
  registerGroup() {
    if (this.createGroupForm.invalid) {
      this.toastService.presentToast('Please fill out all required fields correctly.', 'bottom', 3000);
      return;
    }

    // Use the Group interface for type safety
    const groupData: Group = this.createGroupForm.value;
    
    console.log('Submitting Group Data:', groupData);

    // Call the service instead of http directly
    this.groupService.createGroup(groupData).subscribe(
      (response) => {
        this.toastService.presentToast('Club created successfully!', 'bottom', 2000);
        this.router.navigate(['/home']);
      },
      (error) => {
        console.error('Error creating group:', error);
        this.toastService.presentToast('Error creating club. Please try again.', 'bottom', 3000);
      }
    );
  }
}
