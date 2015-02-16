'use strict';

/**
 * @ngdoc function
 * @name payvizApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the payvizApp
 */
angular.module('payvizApp')
  .controller('MainCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
    $('.tips, .referencias, hr:last').show();
    var contratos = [];
    angular.copy(imputaciones, contratos);

    for (var i = 0; i < contratos.length; i++){
      var c = contratos[i];
      if(!c.monto_total){
        c.monto_total = _.reduce(c.imputaciones,function(sum, el) { return sum + el.monto },0);
      }
    }


    console.log(contratos.length);
    $scope.data = contratos;
    //$scope.$apply();
  });
