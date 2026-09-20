package com.movefuel.mufil2.ui.screens.fsh

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FSH010ScanGroceryBarcodeScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FSH_010",
        title = "Scan Grocery Barcode",
        subtitle = "Shopping and pantry workflow.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FSH_011,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FSH_009,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Scan grocery barcode","Add a packaged product to your shopping list.")
            MFNotice("Fallback","If the barcode is unknown, create a manual shopping item.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FSH010ScanGroceryBarcodeScreenPreview() {
    MoveFuelTheme { FSH010ScanGroceryBarcodeScreen {} }
}
