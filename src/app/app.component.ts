import { Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';
import { GridOptions } from 'ag-grid-community';
import _ from 'lodash';
import moment from 'moment';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFlexModule } from 'ng-zorro-antd/flex';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzSelectModule, NzSelectOptionInterface } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ApptData } from './app.model';
import { AppointmentOptimizer } from './optimizer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AgGridModule,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzGridModule,
    NzSelectModule,
    NzFormModule,
    NzFlexModule,
    NzTableModule,
    NzMessageModule,
    NzDatePickerModule,
    ReactiveFormsModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  @ViewChild("agGrid") agGrid!: AgGridAngular;
  apptTimes: NzSelectOptionInterface[] = [];
  apptFrom = new FormGroup({
    apptTime: new FormControl<Date | null>(null, Validators.required)
  });
  userForm = new FormGroup({
    userName: new FormControl<string | null>(null, Validators.required),
    userTime: new FormControl<Date[] | null>(null, Validators.required)
  });

  gridOptions: GridOptions = {
    columnDefs: [
      {
        headerName: '時段',
        field: 'apptTime',
        valueFormatter:  (params) => {
          const value: Date = params.value;
          return moment(value).format('MM/DD HH');
        }
      },
      { headerName: '客人', field: 'users' }
    ]
  }
  rowData: ApptData[] = [];

  onAddApptTime() {
    if (!this.valid(this.apptFrom)) {
      return;
    }
    const newTime = _.clone(this.apptFrom.value.apptTime) as Date;
    newTime.setMinutes(0);
    newTime.setSeconds(0);

    if (_.some(this.rowData, (row) => moment(row.apptTime).isSame(newTime))) {
      alert("已有相同時段");
      return;
    }

    const newRowData = { apptTime: newTime, users: [] };
    this.rowData = _.sortBy([...this.rowData, newRowData], "apptTime");
    this.apptTimes = _.sortBy([...this.apptTimes, { value: newTime, label: moment(newTime).format('MM/DD HH') }], "value");
    this.apptFrom.reset();
  }

  onAddUser() {
    if (!this.valid(this.userForm)) {
      return;
    }

    const { userName, userTime } = this.userForm.value;
    for (const time of userTime!) {
      const rowIndex = _.findIndex(this.rowData, (row) => moment(row.apptTime).isSame(time));
      this.rowData[rowIndex].users = [...this.rowData[rowIndex].users, userName!];
    }
    this.rowData = [...this.rowData];
    this.userForm.reset();
  }

  optimize() {
    const optimizer = new AppointmentOptimizer(this.rowData);
    const result = optimizer.optimize();

    console.log('Matched Appointments:');
    result.matchedAppointments.forEach(appt => {
        console.log(`Time: ${appt.apptTime.toLocaleString()}, Users: ${appt.users.join(', ')}`);
    });

    console.log('\nUnmatched Users:');
    console.log(result.unmatchedUsers.join(', '));
  }

  valid(from: FormGroup) {
    if (!from.valid) {
      Object.values(from.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return false;
    }
    return true;
  }
}
