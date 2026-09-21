package com.movefuel.mufil2.ui.screens.bar

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun BAR011ConfirmProductScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "BAR_011",
        title = "Confirm Product",
        subtitle = "Barcode and nutrition-label capture with fallback entry.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.BAR_012,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BAR_010,
        onNavigate = onNavigate,
    ) {
            MFListItem("Detected barcode product", "Product identity only · not consumed", "Review")
            MFNotice("Product ≠ consumed", "A barcode result is not counted as eaten until the shared confirmation boundary is committed.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun BAR011ConfirmProductScreenPreview() {
    MoveFuelTheme { BAR011ConfirmProductScreen {} }
}
