var adjust_objEnter = '';
var adjust_attributes;
var adjust_occluded;

// Index into which control point has been selected:
var selectedControlPoint;

// Location of center of mass:
var center_x;
var center_y;

// Element ids of drawn control points:
var control_ids = null;

// Element id of drawn center point:
var center_id = null;

// ID of DOM element to attach to:
var control_div_attach = 'select_canvas';

// ADJUST POLYGON,
function StartAdjustEvent() {
  console.log('LabelMe: Starting adjust event...');

  // We need to capture the data before closing the bubble 
  // (THIS IS AN UGLY HACK)
  adjust_objEnter = document.getElementById('objEnter').value;
  adjust_attributes = document.getElementById('attributes').value;
  adjust_occluded = document.getElementById('occluded').value;
  
  CloseEditPopup();
  main_image.ScrollbarsOn();
  
  // Get annotation on the select canvas:
  var anno = main_select_canvas.Peek();
  
  // Show control points:
  ShowControlPoints(anno);

  // Show center of mass:
  ShowCenterOfMass(anno);

  $('#select_canvas_div').attr("onmousedown","javascript:StopAdjustEvent();return false;");
}

// This function shows all control points for an annotation.
function ShowControlPoints(anno) {
  var im_ratio = main_image.GetImRatio();
  if(!control_ids) control_ids = new Array();
  for(var i = 0; i < anno.pts_x.length; i++) {
    // Draw control point:
    control_ids.push(DrawPoint(control_div_attach,anno.pts_x[i],anno.pts_y[i],'r="5" fill="#00ff00" stroke="#ffffff" stroke-width="2.5"',im_ratio));

    // Set action:
    $('#'+control_ids[i]).attr('onmousedown','javascript:StartMoveControlPoint(' + i + ');');
  }
}

// This function removes all displayed control points from an annotation
function RemoveControlPoints() {
  if(control_ids) {
    for(var i = 0; i < control_ids.length; i++) $('#'+control_ids[i]).remove();
    control_ids = null;
  }
}

// This function shows the middle grab point for a polygon.
function ShowCenterOfMass(anno) {
  var im_ratio = main_image.GetImRatio();
  CenterOfMass(anno.pts_x,anno.pts_y);
  var MarkerSize = 8;
  if(anno.pts_x.length==1) MarkerSize = 6;

  // Draw center point:
  center_id = DrawPoint(control_div_attach,center_x,center_y,'r="' + MarkerSize + '" fill="red" stroke="#ffffff" stroke-width="' + MarkerSize/2 + '"',im_ratio);

  // Set action:
  $('#'+center_id).attr('onmousedown','javascript:StartMoveCenterOfMass();');
}

// This function removes the middle grab point for a polygon
function RemoveCenterOfMass() {
  if(center_id) {
    $('#'+center_id).remove();
    center_id = null;
  }
}

// Compute center of mass for a polygon:
function CenterOfMass(x,y) {
  var N = x.length;
  
  // Trivial center of mass for single point:
  if(N==1) {
    center_x = x[0];
    center_y = y[0];
    return;
  }

  // The midpoint is the average polygon edge midpoint weighted by edge length:
  center_x = 0; center_y = 0;
  var perimeter = 0;
  for(var i = 1; i <= N; i++) {
    var length = Math.round(Math.sqrt(Math.pow(x[i-1]-x[i%N], 2) + Math.pow(y[i-1]-y[i%N], 2)));
    center_x += length*Math.round((x[i-1] + x[i%N])/2);
    center_y += length*Math.round((y[i-1] + y[i%N])/2);
    perimeter += length;
  }
  center_x /= perimeter;
  center_y /= perimeter;
}

function StartMoveControlPoint(i) {
  if(!isEditingControlPoint) {
    $('#select_canvas_div').attr("onmousedown","");
    $('#select_canvas_div').attr("onmousemove","javascript:MoveControlPoint(event);");
    $('#body').attr("onmouseup","javascript:StopMoveControlPoint(event);");

    RemoveCenterOfMass();
    selectedControlPoint = i;

    isEditingControlPoint = 1;
    editedControlPoints = 1;
  }
}

function MoveControlPoint(event) {
  if(isEditingControlPoint) {
    // Get annotation on the select canvas:
    var anno = main_select_canvas.Peek();

    var x = GetEventPosX(event);
    var y = GetEventPosY(event);
    var im_ratio = main_image.GetImRatio();
    var i = selectedControlPoint;

    // Set point:
    anno.pts_x[i] = Math.max(Math.min(Math.round(x/im_ratio),main_image.width_orig),1);
    anno.pts_y[i] = Math.max(Math.min(Math.round(y/im_ratio),main_image.height_orig),1);
    
    // Remove polygon and redraw:
    $('#'+anno.polygon_id).remove();
    anno.DrawPolygon(im_ratio);
    
    // Adjust control points:
    RemoveControlPoints();
    ShowControlPoints(anno);
  }
} 

function StopMoveControlPoint(event) {
  if(isEditingControlPoint) {
    MoveControlPoint(event);
    var anno = main_select_canvas.Peek();
    FillPolygon(anno.polygon_id);
    ShowCenterOfMass(anno);
    isEditingControlPoint = 0;

    $('#select_canvas_div').attr("onmousedown","javascript:StopAdjustEvent();return false;");
  }
}

function StartMoveCenterOfMass() {
  if(!isMovingCenterOfMass) {
    $('#select_canvas_div').attr("onmousedown","");
    $('#select_canvas_div').attr("onmousemove","javascript:MoveCenterOfMass(event);");
    $('#body').attr("onmouseup","javascript:StopMoveCenterOfMass(event);");

    RemoveControlPoints();

    isMovingCenterOfMass = 1;
    editedControlPoints = 1;
  }
}

function MoveCenterOfMass(event) {
  if(isMovingCenterOfMass) {
    // Get annotation on the select canvas:
    var anno = main_select_canvas.Peek();

    var x = GetEventPosX(event);
    var y = GetEventPosY(event);
    var im_ratio = main_image.GetImRatio();

    var dx = Math.round(x/im_ratio)-center_x;
    var dy = Math.round(y/im_ratio)-center_y;
    
    // Adjust dx,dy to make sure we don't go outside of the image:
    for(i=0; i<anno.pts_x.length; i++) {
      dx = Math.max(anno.pts_x[i]+dx,1)-anno.pts_x[i];
      dy = Math.max(anno.pts_y[i]+dy,1)-anno.pts_y[i];
      dx = Math.min(anno.pts_x[i]+dx,main_image.width_orig)-anno.pts_x[i];
      dy = Math.min(anno.pts_y[i]+dy,main_image.height_orig)-anno.pts_y[i];
    }
    
    for(i=0; i<anno.pts_x.length; i++) {
      anno.pts_x[i] = Math.round(anno.pts_x[i]+dx);
      anno.pts_y[i] = Math.round(anno.pts_y[i]+dy);
    }
    center_x = Math.round(im_ratio*(dx+center_x));
    center_y = Math.round(im_ratio*(dy+center_y));
    
    // Remove polygon and redraw:
    $('#'+anno.polygon_id).remove();
    anno.DrawPolygon(im_ratio);
    
    // Redraw control points and center of mass:
    RemoveControlPoints();
    RemoveCenterOfMass();
    ShowControlPoints(anno);
    ShowCenterOfMass(anno);
  }
}
    
function StopMoveCenterOfMass(event) {
  if(isMovingCenterOfMass) {
    MoveCenterOfMass(event);
    var anno = main_select_canvas.Peek();
    FillPolygon(anno.polygon_id);
    isMovingCenterOfMass = 0;
    
    $('#select_canvas_div').attr("onmousedown","javascript:StopAdjustEvent();return false;");
  }
}

function StopAdjustEvent() {
  if(username_flag) submit_username();
  main_handler.SubmitEditLabel();
  RemoveControlPoints();
  RemoveCenterOfMass();
  console.log('LabelMe: Stopped adjust event.');
}