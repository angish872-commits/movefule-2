package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO012ServingSelectorScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_012",
        title = "Review & Confirm Food",
        subtitle = "Check the serving and meal context before it becomes a confirmed nutrition fact.",
        primaryLabel = "Confirm food",
        primaryRoute = MoveFuelRoute.FNO_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_011,
        onNavigate = onNavigate,
    ) {
        MFField("Serving amount", "")
        MFField("Meal", "")
        MFField("Time", "")
        MFMacroBars(null, null, null, null)
        MFNotice(
            title = "Confirmation boundary",
            body = "Search, camera, barcode, and recipe results remain drafts until you confirm them here.",
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun FNO012ServingSelectorScreenPreview() {
    MoveFuelTheme { FNO012ServingSelectorScreen {} }
}
