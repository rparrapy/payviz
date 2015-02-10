'use strict';

/**
 * @ngdoc function
 * @name payvizApp.controller:ListCtrl
 * @description
 * # ListCtrl
 * Controller of the payvizApp
 */
angular.module('payvizApp')
  .controller('ListCtrl', function ($scope, DTOptionsBuilder, DTColumnBuilder, DTColumnDefBuilder) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];

    var liToSelect = 2;
    $(".nav.nav-pills li").removeClass("active");
    $(".nav.nav-pills li:eq("+(liToSelect-1)+")").addClass("active");

    var contratos = imputaciones;

    for (var i = 0; i < contratos.length; i++){
      var c = contratos[i];
      if(!c.monto_total){
        c.monto_total = _.reduce(c.imputaciones,function(sum, el) { return sum + el.monto },0);
      }
      if(!c.llamado_nombre){
        c.llamado_nombre = 'NO POSEE';
      }
    }

    contratos = _.sortBy(contratos, function(o) { return o.llamado_nombre; })

    $scope.contratos = contratos;



    $scope.dtOptions = DTOptionsBuilder.newOptions().withPaginationType('full_numbers')
      .withOption('order', [[2, 'asc']])
      .withOption('language', {
      "sProcessing":     "Procesando...",
      "sLengthMenu":     "Mostrar _MENU_ registros",
      "sZeroRecords":    "No se encontraron resultados",
      "sEmptyTable":     "Ningún dato disponible en esta tabla",
      "sInfo":           "Registros del _START_ al _END_ de un total de _TOTAL_ registros",
      "sInfoEmpty":      "Registros del 0 al 0 de un total de 0 registros",
      "sInfoFiltered":   "(filtrado de un total de _MAX_ registros)",
      "sInfoPostFix":    "",
      "sSearch":         "Buscar:",
      "sUrl":            "",
      "sInfoThousands":  ",",
      "sLoadingRecords": "Cargando...",
      "oPaginate": {
          "sFirst":    "Primero",
          "sLast":     "Último",
          "sNext":     "Siguiente",
          "sPrevious": "Anterior"
      },
      "oAria": {
          "sSortAscending":  ": Activar para ordenar la columna de manera ascendente",
          "sSortDescending": ": Activar para ordenar la columna de manera descendente"
      }
    })
      .withBootstrap()
      .withOption('responsive', true);

    $scope.detalle_actual = -1;

    $scope.dtColumnDefs = [
        DTColumnDefBuilder.newColumnDef(0).notSortable().withClass('details-control'),
        DTColumnDefBuilder.newColumnDef(5).renderWith(function(data, type, full) {
          console.log(full);
          return parseInt(data).toLocaleString();
        })
    ];

    $scope.$on('event:dataTableLoaded', function(event, loadedDT) {
      // Setup - add a text input to each footer cell
      var id = '#' + loadedDT.id;
      $(id + ' tfoot th:not(:first)').each(function() {
        var title = $(id + ' thead th').eq($(this).index()).text();
        $(this).html('<input class="form-control input-sm" style="font-size:smaller;max-width:100px;" type="text" placeholder="' + title + '" />');
      });

      var table = loadedDT.DataTable;
      // Apply the search
      table.columns().eq(0).each(function(colIdx) {
        $('input', table.column(colIdx).footer()).on('keyup change', function() {
          table
            .column(colIdx)
            .search(this.value)
            .draw();
        });
      });

    });


    function generarDiv(d){
      var html = " " + $("#template-detalle").html();
      console.log(html);

      return html.replace('{categoria_nombre}', typeof d.categoria_nombre !== "undefined" ? d.categoria_nombre : 'No aplica')
                .replace('{monto_total}', typeof d.monto_total !== "undefined" ? parseInt(d.monto_total).toLocaleString() : 'No aplica')
                .replace('{ejecutado}', typeof d.ejecutado !== "undefined" ? (d.ejecutado * 100).toFixed(0) : '0')
                .replace('{pro_nombre}', typeof d.pro_nombre !== "undefined" ? d.pro_nombre : 'No aplica')
                .replace('{fecha_contrato}', typeof d.fecha_contrato !== "undefined" ? d.fecha_contrato : 'No aplica')
                .replace('{llamado_nombre}', typeof d.llamado_nombre !== "undefined" ? d.llamado_nombre : 'No aplica')
                .replace('{cod_contrato}', typeof d.cod_contrato !== "undefined" ? d.cod_contrato : 'No aplica')
                .replace('{monto_pagado}', typeof d.monto_pagado !== "undefined" ? d.monto_pagado.toLocaleString() : 'No aplica')
                .replace('{mod_nombre}', typeof d.mod_nombre !== "undefined" ? d.mod_nombre : 'No aplica')
                .replace('{id_timeline}', typeof d.cod_contrato !== "undefined" ? d.cod_contrato : '1');



    }

    $scope.mostrarDetalle = function(c,id){
      $scope.ocultarDetalles();

      if(id != $scope.detalle_actual){
        console.log(c,id);
        var html = generarDiv(c)
        $("#contrato-"+id).after('<tr class="detalle"><td colspan="7">'+ html +'</td></tr>');
        test(c.cod_contrato);
        $scope.detalle_actual = id;
      }else{
        $scope.detalle_actual = null;
      }

    }

    $scope.ocultarDetalles = function(){
      $(".detalle").remove();

    }



    function test(id) {


       //adendas de dinero
      var events = [
      {dates: [new Date(2011, 2, 31), new Date(2011, 12, 30)], title: "Monto inicial", description: "Gs. 000.000.000", section: 0},
      {dates: [new Date(2011, 10, 31), new Date(2012, 3, 30)], title: "Adenda", description: "+ Gs. 000.000.000", section: 0},
      {dates: [new Date(2011, 4, 1)], title: "Pago", description: "Gs. 000.000.000", section: 0, attrs: {fill: "#00698C", stroke: "#00698C"}},
      {dates: [new Date(2011, 5, 1)], title: "Pago", description: "Gs. 000.000.000", section: 0, attrs: {fill: "#00698C", stroke: "#00698C"}},
      {dates: [new Date(2011, 11, 1)], title: "Pago", description: "Gs. 000.000.000", section: 0, attrs: {fill: "#00698C", stroke: "#00698C"}},
      {dates: [new Date(2011, 11, 1)], title: "Pago Adenda", description: "Gs. 000.000.000", section: 0, attrs: {fill: "#00698C", stroke: "#00698C"}},
      {dates: [new Date(2011, 12, 1)], title: "Pago Adenda", description: "Gs. 000.000.000", section: 0, attrs: {fill: "#00698C", stroke: "#00698C"}},
      ];

      //adendas de tiempo
      var sections = [
      {dates: [new Date(2011, 2, 31), new Date(2011, 9, 30)], title: "Tiempo incial de contrato", section: 0, attrs: {fill: "#FFDFBF"}},
      {dates: [new Date(2011, 9, 30), new Date(2011, 10, 30)], title: "Adenta de tiempo +30 días", section: 1, attrs: {fill: "#FFE9D4"}},
      {dates: [new Date(2011, 10, 30), new Date(2011, 11, 30)], title: "Adenta de tiempo +30 días", section: 2, attrs: {fill: "#FFDFBF"}},
      {dates: [new Date(2011, 11, 30), new Date(2012, 12, 30)], title: "Adenta de tiempo +30 días", section: 3, attrs: {fill: "#FFE9D4"}}
      ];
       console.log("Timeline:");
       console.log(id);
       var timeline1 = new Chronoline(document.getElementById("target-"+id), events,
        {
          visibleSpan: DAY_IN_MILLISECONDS * 366,
          animated: true,
          tooltips: true,
          defaultStartDate: new Date(2011, 1, 15),
          sections: sections,
          sectionLabelAttrs: {'fill': '#333', 'font-weight': 'bold'},
          labelInterval: isHalfMonth,
          hashInterval: isHalfMonth,
          scrollLeft: prevQuarter,
          scrollRight: nextQuarter,
          floatingSubLabels: true,
          draggable: true,
          width : 800
      });

    }

    //$scope.$apply();
  });
