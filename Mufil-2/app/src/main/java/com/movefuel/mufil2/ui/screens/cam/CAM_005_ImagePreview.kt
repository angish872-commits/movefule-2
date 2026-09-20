package com.movefuel.mufil2.ui.screens.cam

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAM005ImagePreviewScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAM_005",
        title = "Image Preview",
        subtitle = "Food photo and gallery analysis with explicit review.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAM_006,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAM_004,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Meal photo", "Review before creating canonical food facts.")
            MFListItem("Rice", "Estimated portion · editable", "Edit")
            MFListItem("Chicken", "Estimated portion · editable", "Edit")
            MFListItem("Vegetables", "Estimated portion · editable", "Edit")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAM005ImagePreviewScreenPreview() {
    MoveFuelTheme { CAM005ImagePreviewScreen {} }
}
